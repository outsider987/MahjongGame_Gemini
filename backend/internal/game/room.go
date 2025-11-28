package game

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	"github.com/victor/mahjong-backend/internal/game/mahjong"
	"github.com/victor/mahjong-backend/internal/record"
)

const (
	MaxPlayersPerRoom = 4
	ActionTimeout     = 10 * time.Second
)

var (
	ErrRoomFull      = errors.New("room is full")
	ErrGameInProgress = errors.New("game already in progress")
	ErrNotYourTurn   = errors.New("not your turn")
	ErrInvalidAction = errors.New("invalid action")
)

type RoomSettings struct {
	BaseScore int
	TaiScore  int
	Rounds    int
}

type Room struct {
	ID          string
	Settings    RoomSettings
	Players     []GameClient
	State       *GameState
	hub         GameHub
	recordRepo  record.Repository
	mu          sync.RWMutex
	actionTimer *time.Timer
}

type RoomManager struct {
	rooms      map[string]*Room
	hub        GameHub
	recordRepo record.Repository
	mu         sync.RWMutex
}

func NewRoomManager(hub GameHub, recordRepo record.Repository) *RoomManager {
	return &RoomManager{
		rooms:      make(map[string]*Room),
		hub:        hub,
		recordRepo: recordRepo,
	}
}

func (rm *RoomManager) CreateRoom(settings RoomSettings) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	id := generateRoomID()
	room := &Room{
		ID:         id,
		Settings:   settings,
		Players:    make([]GameClient, 0, MaxPlayersPerRoom),
		hub:        rm.hub,
		recordRepo: rm.recordRepo,
	}

	rm.rooms[id] = room
	return room
}

func (rm *RoomManager) GetRoom(id string) *Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return rm.rooms[id]
}

func (rm *RoomManager) RemoveRoom(id string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	delete(rm.rooms, id)
}

func generateRoomID() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func (r *Room) AddPlayer(client GameClient) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.Players) >= MaxPlayersPerRoom {
		return ErrRoomFull
	}

	if r.State != nil && r.State.Phase != PhaseWaiting && r.State.Phase != PhaseGameOver {
		return ErrGameInProgress
	}

	client.SetPlayerIndex(len(r.Players))
	r.Players = append(r.Players, client)

	// Notify all players
	r.broadcastPlayerList()

	// Auto-start when full
	if len(r.Players) == MaxPlayersPerRoom {
		go r.StartGame()
	}

	return nil
}

func (r *Room) RemovePlayer(client GameClient) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, p := range r.Players {
		if p.GetUserID() == client.GetUserID() {
			r.Players = append(r.Players[:i], r.Players[i+1:]...)
			break
		}
	}

	// Update player indices
	for i, p := range r.Players {
		p.SetPlayerIndex(i)
	}

	r.broadcastPlayerList()
}

func (r *Room) StartGame() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.Players) < MaxPlayersPerRoom {
		return
	}

	// Initialize game state
	playerInfos := make([]PlayerInfo, len(r.Players))
	for i, client := range r.Players {
		playerInfos[i] = PlayerInfo{
			ID:          client.GetUserID(),
			DisplayName: client.GetDisplayName(),
		}
	}

	r.State = NewGameState(playerInfos, r.Settings)
	r.State.StartInitPhase()

	r.broadcastState()
}

func (r *Room) Restart() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.State == nil || r.State.Phase != PhaseGameOver {
		return
	}

	playerInfos := make([]PlayerInfo, len(r.Players))
	for i, client := range r.Players {
		playerInfos[i] = PlayerInfo{
			ID:          client.GetUserID(),
			DisplayName: client.GetDisplayName(),
		}
	}

	r.State = NewGameState(playerInfos, r.Settings)
	r.State.StartInitPhase()

	r.broadcastState()
}

func (r *Room) HandleDiscard(client GameClient, tileIndex int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.State == nil {
		return
	}

	if r.State.CurrentTurn != client.GetPlayerIndex() {
		client.Send("game:error", "Not your turn")
		return
	}

	if r.State.Phase != PhaseDiscard {
		client.Send("game:error", "Cannot discard now")
		return
	}

	if err := r.State.Discard(client.GetPlayerIndex(), tileIndex); err != nil {
		client.Send("game:error", err.Error())
		return
	}

	r.broadcastState()

	// Check for reactions
	r.checkInteractions()
}

func (r *Room) HandleOperation(client GameClient, action string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.State == nil {
		return
	}

	actionType := mahjong.ActionType(action)

	if err := r.State.HandleAction(client.GetPlayerIndex(), actionType); err != nil {
		client.Send("game:error", err.Error())
		return
	}

	r.broadcastState()

	// Check game over or continue
	if r.State.Phase == PhaseGameOver {
		r.saveGameRecord()
	}
}

func (r *Room) checkInteractions() {
	// Check for claims (Pong, Kong, Chow, Hu)
	hasClaims := false
	for i, player := range r.State.Players {
		actions := r.State.GetAvailableActions(i)
		if len(actions) > 0 {
			hasClaims = true
			player.AvailableActions = actions
		}
	}

	if hasClaims {
		r.State.Phase = PhaseResolveAction
		r.broadcastState()
		r.startActionTimer()
	} else {
		r.State.NextTurn()
		r.broadcastState()
	}
}

func (r *Room) startActionTimer() {
	if r.actionTimer != nil {
		r.actionTimer.Stop()
	}

	r.actionTimer = time.AfterFunc(ActionTimeout, func() {
		r.mu.Lock()
		defer r.mu.Unlock()

		// Auto-pass for players who didn't respond
		for i := range r.State.Players {
			if len(r.State.Players[i].AvailableActions) > 0 {
				r.State.HandleAction(i, mahjong.ActionPass)
			}
		}

		r.broadcastState()
	})
}

func (r *Room) broadcastState() {
	dto := r.State.ToDTO()
	
	// Send personalized state to each player
	for i, client := range r.Players {
		personalDTO := r.State.ToPersonalDTO(i)
		client.Send("game:state", personalDTO)
	}

	// Also broadcast general state to room
	r.hub.BroadcastToRoom(r.ID, "game:state", dto)
}

func (r *Room) broadcastPlayerList() {
	players := make([]map[string]interface{}, len(r.Players))
	for i, p := range r.Players {
		players[i] = map[string]interface{}{
			"index":        i,
			"display_name": p.GetDisplayName(),
			"user_id":      p.GetUserID(),
		}
	}

	r.hub.BroadcastToRoom(r.ID, "room:players", map[string]interface{}{
		"players": players,
		"count":   len(r.Players),
	})
}

func (r *Room) broadcastEffect(effectType, text string, playerIndex int, variant string, tile *mahjong.Tile) {
	effect := map[string]interface{}{
		"type":         effectType,
		"text":         text,
		"playerIndex":  playerIndex,
		"variant":      variant,
	}
	if tile != nil {
		effect["tile"] = tile.ToDTO()
	}

	r.hub.BroadcastToRoom(r.ID, "game:effect", effect)
}

func (r *Room) saveGameRecord() {
	if r.State == nil || r.recordRepo == nil {
		return
	}

	playerData := make([]record.PlayerData, len(r.State.Players))
	for i, p := range r.State.Players {
		playerData[i] = record.PlayerData{
			UserID:     p.Info.ID,
			PlayerName: p.Info.DisplayName,
			ScoreDelta: p.ScoreDelta,
			IsWinner:   p.IsWinner,
			IsDealer:   p.IsDealer,
			TaiCount:   p.TaiCount,
		}
	}

	var winnerID *uint
	if r.State.WinnerIndex >= 0 {
		winnerID = &r.State.Players[r.State.WinnerIndex].Info.ID
	}

	gameRecord := &record.GameRecord{
		RoomID:     r.ID,
		WinnerID:   winnerID,
		WinType:    record.WinType(r.State.WinType),
		TaiCount:   r.State.TaiCount,
		PlayerData: playerData,
	}

	r.recordRepo.Create(gameRecord)
}

