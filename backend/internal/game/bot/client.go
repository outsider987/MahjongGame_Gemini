package bot

import (
	"encoding/json"
	"math/rand"
	"sync"
	"time"

	"github.com/victor/mahjong-backend/internal/game/mahjong"
)

// BotClient implements GameClient interface for AI players
type BotClient struct {
	userID      uint
	displayName string
	playerIndex int
	bot         *Bot
	mu          sync.RWMutex
	actionChan  chan botAction
	stateData   map[string]interface{} // Store latest game state
}

type botAction struct {
	actionType string
	data       interface{}
}

// NewBotClient creates a new bot client
func NewBotClient(userID uint, displayName string, difficulty string) *BotClient {
	return &BotClient{
		userID:      userID,
		displayName: displayName,
		playerIndex: -1,
		bot:         NewBot(difficulty),
		actionChan:  make(chan botAction, 10),
		stateData:   make(map[string]interface{}),
	}
}

// GetUserID returns the bot's user ID
func (bc *BotClient) GetUserID() uint {
	return bc.userID
}

// GetDisplayName returns the bot's display name
func (bc *BotClient) GetDisplayName() string {
	return bc.displayName
}

// GetPlayerIndex returns the bot's player index
func (bc *BotClient) GetPlayerIndex() int {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	return bc.playerIndex
}

// SetPlayerIndex sets the bot's player index
func (bc *BotClient) SetPlayerIndex(idx int) {
	bc.mu.Lock()
	defer bc.mu.Unlock()
	bc.playerIndex = idx
}

// Send receives game state updates and triggers bot decision logic
func (bc *BotClient) Send(event string, data interface{}) {
	// Handle game state updates
	if event == "game:state" {
		bc.mu.Lock()
		// Store state data for later use
		if stateMap, ok := data.(map[string]interface{}); ok {
			bc.stateData = stateMap
		} else {
			// Try to convert from JSON
			dataBytes, err := json.Marshal(data)
			if err == nil {
				json.Unmarshal(dataBytes, &bc.stateData)
			}
		}
		bc.mu.Unlock()
		go bc.handleGameState(data)
	}
}

// GetStateData returns the latest game state data
func (bc *BotClient) GetStateData() map[string]interface{} {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	return bc.stateData
}

// DecideDiscard returns the tile index to discard
func (bc *BotClient) DecideDiscard(hand []*mahjong.Tile) int {
	return bc.bot.DecideDiscard(hand)
}

// ShouldInteract returns whether the bot should interact with a discard
func (bc *BotClient) ShouldInteract(action mahjong.ActionType, hand []*mahjong.Tile, discard *mahjong.Tile) bool {
	return bc.bot.ShouldInteract(action, hand, discard)
}

// handleGameState processes game state and makes bot decisions
func (bc *BotClient) handleGameState(data interface{}) {
	// Convert data to map to extract game state
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return
	}

	var state map[string]interface{}
	if err := json.Unmarshal(dataBytes, &state); err != nil {
		return
	}

	// Get current turn and phase
	turn, ok := state["turn"].(float64)
	if !ok {
		return
	}

	phase, ok := state["state"].(string)
	if !ok {
		return
	}

	playerIdx := int(turn)
	if playerIdx != bc.playerIndex {
		return // Not bot's turn
	}

	// Get player data
	players, ok := state["players"].([]interface{})
	if !ok || len(players) <= playerIdx {
		return
	}

	playerData, ok := players[playerIdx].(map[string]interface{})
	if !ok {
		return
	}

	// Simulate thinking time (0.5-2 seconds)
	thinkTime := time.Duration(500+rand.Intn(1500)) * time.Millisecond
	time.Sleep(thinkTime)

	// Handle different game phases
	switch phase {
	case "STATE_DISCARD":
		bc.handleDiscard(playerData)
	case "STATE_RESOLVE_ACTION":
		bc.handleAction(playerData, state)
	}
}

// handleDiscard handles bot's discard decision
func (bc *BotClient) handleDiscard(playerData map[string]interface{}) {
	// Get hand if available (should be available for bot's own hand)
	hand := make([]*mahjong.Tile, 0)
	if handData, ok := playerData["hand"].([]interface{}); ok {
		for _, tileData := range handData {
			tileBytes, _ := json.Marshal(tileData)
			var tile mahjong.Tile
			if err := json.Unmarshal(tileBytes, &tile); err == nil {
				hand = append(hand, &tile)
			}
		}
	}

	if len(hand) == 0 {
		return
	}

	// Use bot to decide which tile to discard
	tileIndex := bc.bot.DecideDiscard(hand)
	if tileIndex < 0 || tileIndex >= len(hand) {
		tileIndex = len(hand) - 1 // Fallback to last tile
	}

	// Store action to be executed by room
	bc.actionChan <- botAction{
		actionType: "discard",
		data:       tileIndex,
	}
}

// handleAction handles bot's action decision (Pong, Kong, Chow, Hu, Pass)
func (bc *BotClient) handleAction(playerData map[string]interface{}, state map[string]interface{}) {
	// Get available actions
	availableActions, ok := playerData["availableActions"].([]interface{})
	if !ok {
		availableActions = []interface{}{}
	}

	// Get last discard
	lastDiscard, hasLastDiscard := state["lastDiscard"].(map[string]interface{})

	// Get hand from state data if available
	hand := make([]*mahjong.Tile, 0)
	if players, ok := state["players"].([]interface{}); ok && bc.playerIndex >= 0 && bc.playerIndex < len(players) {
		if playerData, ok := players[bc.playerIndex].(map[string]interface{}); ok {
			if handData, ok := playerData["hand"].([]interface{}); ok {
				for _, tileData := range handData {
					tileBytes, _ := json.Marshal(tileData)
					var tile mahjong.Tile
					if err := json.Unmarshal(tileBytes, &tile); err == nil {
						hand = append(hand, &tile)
					}
				}
			}
		}
	}

	if len(availableActions) == 0 {
		// No actions available, pass
		bc.actionChan <- botAction{
			actionType: "operation",
			data:       string(mahjong.ActionPass),
		}
		return
	}

	// Check for Hu first (highest priority)
	for _, action := range availableActions {
		if actionStr, ok := action.(string); ok && actionStr == "HU" {
			bc.actionChan <- botAction{
				actionType: "operation",
				data:       string(mahjong.ActionHu),
			}
			return
		}
	}

	// Get discard tile if available
	var discardTile *mahjong.Tile
	if hasLastDiscard {
		if tileData, ok := lastDiscard["tile"].(map[string]interface{}); ok {
			tileBytes, _ := json.Marshal(tileData)
			var tile mahjong.Tile
			if err := json.Unmarshal(tileBytes, &tile); err == nil {
				discardTile = &tile
			}
		}
	}

	// Use bot to decide whether to interact
	shouldInteract := false
	var actionType mahjong.ActionType

	// Check actions in priority order: Hu > Kong > Pong > Chow
	for _, action := range availableActions {
		if actionStr, ok := action.(string); ok {
			switch actionStr {
			case "KONG":
				actionType = mahjong.ActionKong
				if discardTile != nil {
					shouldInteract = bc.bot.ShouldInteract(mahjong.ActionKong, hand, discardTile)
				} else {
					shouldInteract = true // Auto-kong if no discard (self-kong)
				}
			case "PONG":
				actionType = mahjong.ActionPong
				if discardTile != nil {
					shouldInteract = bc.bot.ShouldInteract(mahjong.ActionPong, hand, discardTile)
				}
			case "CHOW":
				actionType = mahjong.ActionChow
				if discardTile != nil {
					shouldInteract = bc.bot.ShouldInteract(mahjong.ActionChow, hand, discardTile)
				}
			}

			if shouldInteract {
				bc.actionChan <- botAction{
					actionType: "operation",
					data:       string(actionType),
				}
				return
			}
		}
	}

	// Default: pass
	bc.actionChan <- botAction{
		actionType: "operation",
		data:       string(mahjong.ActionPass),
	}
}

// GetAction returns the next action from the bot (non-blocking)
func (bc *BotClient) GetAction() (string, interface{}, bool) {
	select {
	case action := <-bc.actionChan:
		return action.actionType, action.data, true
	default:
		return "", nil, false
	}
}

