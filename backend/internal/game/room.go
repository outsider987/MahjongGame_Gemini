package game

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/victor/mahjong-backend/internal/game/bot"
	"github.com/victor/mahjong-backend/internal/game/mahjong"
	"github.com/victor/mahjong-backend/internal/record"
)

const (
	MaxPlayersPerRoom = 4
	ActionTimeout     = 10 * time.Second
)

var (
	ErrRoomFull       = errors.New("room is full")
	ErrGameInProgress = errors.New("game already in progress")
	ErrNotYourTurn    = errors.New("not your turn")
	ErrInvalidAction  = errors.New("invalid action")
)

type RoomSettings struct {
	BaseScore     int
	TaiScore      int
	Rounds        int
	AIPlayerCount int
}

type Room struct {
	ID           string
	Settings     RoomSettings
	Players      []GameClient
	State        *GameState
	hub          GameHub
	recordRepo   record.Repository
	mu           sync.RWMutex
	actionTimer  *time.Timer
	discardTimer *time.Timer
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

// AddAIPlayers adds AI players to fill the room up to 4 players
func (r *Room) AddAIPlayers() {
	r.mu.Lock()
	defer r.mu.Unlock()

	currentCount := len(r.Players)
	aiCount := r.Settings.AIPlayerCount
	needed := MaxPlayersPerRoom - currentCount

	// Don't add more AI than requested
	if aiCount > needed {
		aiCount = needed
	}

	// Generate unique bot IDs starting from a high number to avoid conflicts
	botIDBase := uint(1000000) // Start from 1,000,000 to avoid conflicts with real user IDs

	for i := 0; i < aiCount; i++ {
		botID := botIDBase + uint(i)
		botName := fmt.Sprintf("AI Player %d", i+1)
		difficulty := "normal" // Default difficulty, could be made configurable

		botClient := bot.NewBotClient(botID, botName, difficulty)
		botClient.SetPlayerIndex(len(r.Players))
		r.Players = append(r.Players, botClient)
	}

	// Notify all players
	r.broadcastPlayerList()

	// Auto-start when full
	if len(r.Players) == MaxPlayersPerRoom {
		go r.StartGame()
	}
}

func (r *Room) StartGame() {
	r.mu.Lock()

	if len(r.Players) < MaxPlayersPerRoom {
		r.mu.Unlock()
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

	// Broadcast initial state (with dice and wind assignment)
	r.mu.Unlock()
	r.broadcastState()

	// Wait 2 seconds for client animation, then deal cards
	go func() {
		log.Printf("[Room %s] Waiting 2 seconds before dealing cards...", r.ID)
		time.Sleep(2 * time.Second)

		r.mu.Lock()
		if r.State != nil {
			log.Printf("[Room %s] Dealing cards now", r.ID)
			r.State.DealCards()
			log.Printf("[Room %s] Cards dealt, phase is now: %s", r.ID, r.State.Phase)
		} else {
			log.Printf("[Room %s] State is nil, cannot deal cards", r.ID)
		}
		r.mu.Unlock()

		// Broadcast state after dealing cards
		r.broadcastState()
		log.Printf("[Room %s] State broadcasted after dealing", r.ID)
	}()
}

func (r *Room) Restart() {
	r.mu.Lock()

	if r.State == nil || r.State.Phase != PhaseGameOver {
		r.mu.Unlock()
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

	r.mu.Unlock()
	r.broadcastState()

	// Wait 2 seconds for client animation, then deal cards
	go func() {
		time.Sleep(2 * time.Second)

		r.mu.Lock()
		if r.State != nil {
			r.State.DealCards()
		}
		r.mu.Unlock()

		r.broadcastState()
	}()
}

func (r *Room) HandleDiscard(client GameClient, tileIndex int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Stop auto-discard timer since player is taking action
	r.stopDiscardTimer()

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

// startDiscardTimer starts a timer for auto-discarding when human player doesn't respond
func (r *Room) startDiscardTimer() {
	// Only start timer during discard phase
	if r.State == nil || r.State.Phase != PhaseDiscard {
		return
	}

	// Stop any existing discard timer
	if r.discardTimer != nil {
		r.discardTimer.Stop()
	}

	currentPlayer := r.State.CurrentTurn

	r.discardTimer = time.AfterFunc(ActionTimeout, func() {
		r.mu.Lock()
		defer r.mu.Unlock()

		// Check if still in discard phase and same player's turn
		if r.State == nil || r.State.Phase != PhaseDiscard {
			return
		}

		// Make sure it's still the same player's turn
		if r.State.CurrentTurn != currentPlayer {
			return
		}

		player := r.State.Players[currentPlayer]

		// Auto-discard the last tile in hand (most recently drawn)
		if len(player.Hand) > 0 {
			lastTileIndex := len(player.Hand) - 1

			// Perform discard
			if err := r.State.Discard(currentPlayer, lastTileIndex); err == nil {
				// First broadcast the discard state
				for i, client := range r.Players {
					personalDTO := r.State.ToPersonalDTO(i)
					client.Send("game:state", personalDTO)
				}
				// Then check for interactions (this will handle next turn and broadcast)
				r.checkInteractions()
			}
		}
	})
}

// stopDiscardTimer stops the discard timer
func (r *Room) stopDiscardTimer() {
	if r.discardTimer != nil {
		r.discardTimer.Stop()
		r.discardTimer = nil
	}
}

func (r *Room) broadcastState() {
	// Safety check
	if r.State == nil {
		return
	}

	// Send personalized state to each player
	// Each player only sees their own hand, not others'
	for i, client := range r.Players {
		personalDTO := r.State.ToPersonalDTO(i)
		client.Send("game:state", personalDTO)
	}

	// Note: We don't broadcast general DTO to avoid overwriting personalized state
	// The personalized state already includes all public information

	// Only handle bot turns and timers during active game phases
	if r.State.Phase == PhaseDiscard || r.State.Phase == PhaseResolveAction {
		// Check if current player is a bot and trigger bot action
		// If not a bot, start auto-discard timer for human player
		if !r.handleBotTurn() {
			r.startDiscardTimer()
		}
	}
}

// handleBotTurn checks if current player is a bot and triggers bot action
// Returns true if current player is a bot, false otherwise
func (r *Room) handleBotTurn() bool {
	if r.State == nil {
		return false
	}

	currentPlayerIdx := r.State.CurrentTurn
	if currentPlayerIdx < 0 || currentPlayerIdx >= len(r.Players) {
		return false
	}

	client := r.Players[currentPlayerIdx]

	// Check if client is a bot using type assertion
	botClient, isBot := client.(*bot.BotClient)
	if !isBot {
		return false // Not a bot, wait for human input
	}

	// Trigger bot decision (it will send action via GetAction)
	// We need to send the state to the bot first
	personalDTO := r.State.ToPersonalDTO(currentPlayerIdx)
	botClient.Send("game:state", personalDTO)

	// Wait for bot to process and check for action periodically
	go func() {
		maxWait := 3 * time.Second // Maximum wait time
		checkInterval := 100 * time.Millisecond
		elapsed := time.Duration(0)

		for elapsed < maxWait {
			time.Sleep(checkInterval)
			elapsed += checkInterval

			actionType, actionData, hasAction := botClient.GetAction()
			if !hasAction {
				continue
			}

			// Check if it's still the bot's turn before processing action
			r.mu.RLock()
			isStillBotTurn := r.State != nil && r.State.CurrentTurn == currentPlayerIdx
			r.mu.RUnlock()

			if !isStillBotTurn {
				return
			}

			// Call HandleDiscard/HandleOperation WITHOUT holding the lock
			// These methods will acquire their own locks
			switch actionType {
			case "discard":
				if tileIndex, ok := actionData.(int); ok {
					r.HandleDiscard(botClient, tileIndex)
				}
			case "operation":
				if action, ok := actionData.(string); ok {
					r.HandleOperation(botClient, action)
				}
			}
			return
		}
	}()

	return true // Current player is a bot
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
		"type":        effectType,
		"text":        text,
		"playerIndex": playerIndex,
		"variant":     variant,
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

// GetState returns the current game state (thread-safe)
func (r *Room) GetState() *GameState {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.State
}

// HasPlayer checks if a user is already in the room (thread-safe)
func (r *Room) HasPlayer(userID uint) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, p := range r.Players {
		if p.GetUserID() == userID {
			return true
		}
	}
	return false
}

// GetPlayerIndex returns the player index for a user, or -1 if not found (thread-safe)
func (r *Room) GetPlayerIndex(userID uint) int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for i, p := range r.Players {
		if p.GetUserID() == userID {
			return i
		}
	}
	return -1
}
