package game

import (
	"math/rand"
	"time"

	"github.com/victor/mahjong-backend/internal/game/mahjong"
)

type GamePhase string

const (
	PhaseWaiting       GamePhase = "WAITING"
	PhaseInit          GamePhase = "STATE_INIT"
	PhaseDraw          GamePhase = "STATE_DRAW"
	PhaseDiscard       GamePhase = "STATE_DISCARD"
	PhaseCheckFlowers  GamePhase = "STATE_CHECK_FLOWERS"
	PhaseResolveAction GamePhase = "STATE_RESOLVE_ACTION"
	PhaseGameOver      GamePhase = "STATE_GAME_OVER"
	PhaseThinking      GamePhase = "STATE_THINKING"
)

type WinType string

const (
	WinTypeZimo WinType = "ZIMO"
	WinTypeRon  WinType = "RON"
	WinTypeDraw WinType = "DRAW"
)

type PlayerInfo struct {
	ID          uint
	DisplayName string
}

type Player struct {
	Info             PlayerInfo
	Hand             []*mahjong.Tile
	Discards         []*mahjong.Tile
	Melds            []mahjong.Meld
	Flowers          []*mahjong.Tile
	Score            int
	ScoreDelta       int
	IsDealer         bool
	IsRiichi         bool
	RiichiDiscardIdx int
	IsWinner         bool
	IsLoser          bool
	TaiCount         int
	Wind             mahjong.Wind
	SeatWind         mahjong.Wind
	AvailableActions []mahjong.ActionType
}

type GameState struct {
	Deck        *mahjong.Deck
	Players     []*Player
	CurrentTurn int
	Phase       GamePhase
	LastDiscard *struct {
		Tile        *mahjong.Tile
		PlayerIndex int
	}
	ActionTimer  int
	WinnerIndex  int
	WinType      WinType
	TaiCount     int
	DealerIndex  int
	RoundWind    mahjong.Wind
	InitData     *InitData
	Settings     RoomSettings
}

type InitData struct {
	Step           string
	DiceValues     []int
	WindAssignment map[int]int
}

func NewGameState(playerInfos []PlayerInfo, settings RoomSettings) *GameState {
	rand.Seed(time.Now().UnixNano())

	players := make([]*Player, len(playerInfos))
	winds := []mahjong.Wind{mahjong.WindEast, mahjong.WindSouth, mahjong.WindWest, mahjong.WindNorth}

	for i, info := range playerInfos {
		players[i] = &Player{
			Info:             info,
			Hand:             make([]*mahjong.Tile, 0),
			Discards:         make([]*mahjong.Tile, 0),
			Melds:            make([]mahjong.Meld, 0),
			Flowers:          make([]*mahjong.Tile, 0),
			Score:            0,
			ScoreDelta:       0,
			IsDealer:         i == 0,
			IsRiichi:         false,
			RiichiDiscardIdx: -1,
			Wind:             winds[i],
			SeatWind:         winds[i],
			AvailableActions: make([]mahjong.ActionType, 0),
		}
	}

	return &GameState{
		Deck:        mahjong.NewDeck(),
		Players:     players,
		CurrentTurn: 0,
		Phase:       PhaseWaiting,
		WinnerIndex: -1,
		DealerIndex: 0,
		RoundWind:   mahjong.WindEast,
		Settings:    settings,
	}
}

func (gs *GameState) StartInitPhase() {
	gs.Phase = PhaseInit
	gs.InitData = &InitData{
		Step:           "DICE",
		DiceValues:     []int{rand.Intn(6) + 1, rand.Intn(6) + 1},
		WindAssignment: make(map[int]int),
	}

	// Assign winds based on dice roll
	diceSum := gs.InitData.DiceValues[0] + gs.InitData.DiceValues[1]
	dealerIdx := (diceSum - 1) % 4

	gs.DealerIndex = dealerIdx
	gs.CurrentTurn = dealerIdx

	winds := []mahjong.Wind{mahjong.WindEast, mahjong.WindSouth, mahjong.WindWest, mahjong.WindNorth}
	windValues := []int{1, 2, 3, 4} // East=1, South=2, West=3, North=4
	for i := range gs.Players {
		windIdx := (i - dealerIdx + 4) % 4
		gs.Players[i].Wind = winds[windIdx]
		gs.Players[i].IsDealer = i == dealerIdx
		gs.InitData.WindAssignment[i] = windValues[windIdx]
	}

	// Deal cards after short delay (client will animate)
	go func() {
		time.Sleep(2 * time.Second)
		gs.DealCards()
	}()
}

func (gs *GameState) DealCards() {
	gs.Deck.Shuffle()

	// Deal 16 tiles to dealer, 13 to others
	for round := 0; round < 4; round++ {
		for i := range gs.Players {
			for j := 0; j < 4; j++ {
				tile := gs.Deck.Draw()
				if tile != nil {
					gs.Players[i].Hand = append(gs.Players[i].Hand, tile)
				}
			}
		}
	}

	// Dealer gets one extra tile
	dealerExtra := gs.Deck.Draw()
	if dealerExtra != nil {
		gs.Players[gs.DealerIndex].Hand = append(gs.Players[gs.DealerIndex].Hand, dealerExtra)
	}

	// Check for flowers and replace
	for i := range gs.Players {
		gs.replaceFlowers(i)
	}

	// Sort hands
	for i := range gs.Players {
		mahjong.SortTiles(gs.Players[i].Hand)
	}

	gs.Phase = PhaseDiscard
	gs.CurrentTurn = gs.DealerIndex
	gs.InitData.Step = "REVEAL"
}

func (gs *GameState) replaceFlowers(playerIdx int) {
	player := gs.Players[playerIdx]
	
	for {
		foundFlower := false
		for i, tile := range player.Hand {
			if tile.Suit == mahjong.SuitFlowers {
				// Remove flower from hand
				player.Hand = append(player.Hand[:i], player.Hand[i+1:]...)
				player.Flowers = append(player.Flowers, tile)
				
				// Draw replacement
				replacement := gs.Deck.Draw()
				if replacement != nil {
					player.Hand = append(player.Hand, replacement)
				}
				
				foundFlower = true
				break
			}
		}
		
		if !foundFlower {
			break
		}
	}
}

func (gs *GameState) Discard(playerIdx, tileIdx int) error {
	if playerIdx != gs.CurrentTurn {
		return ErrNotYourTurn
	}

	player := gs.Players[playerIdx]
	if tileIdx < 0 || tileIdx >= len(player.Hand) {
		return ErrInvalidAction
	}

	tile := player.Hand[tileIdx]
	player.Hand = append(player.Hand[:tileIdx], player.Hand[tileIdx+1:]...)
	player.Discards = append(player.Discards, tile)

	if player.IsRiichi && player.RiichiDiscardIdx == -1 {
		player.RiichiDiscardIdx = len(player.Discards) - 1
	}

	gs.LastDiscard = &struct {
		Tile        *mahjong.Tile
		PlayerIndex int
	}{
		Tile:        tile,
		PlayerIndex: playerIdx,
	}

	mahjong.SortTiles(player.Hand)

	return nil
}

func (gs *GameState) GetAvailableActions(playerIdx int) []mahjong.ActionType {
	if gs.LastDiscard == nil || gs.LastDiscard.PlayerIndex == playerIdx {
		return nil
	}

	player := gs.Players[playerIdx]
	discard := gs.LastDiscard.Tile
	actions := make([]mahjong.ActionType, 0)

	// Check Hu (Ron)
	testHand := append([]*mahjong.Tile{}, player.Hand...)
	testHand = append(testHand, discard)
	if mahjong.CheckWin(testHand, player.Melds) {
		actions = append(actions, mahjong.ActionHu)
	}

	// Skip other actions if player is in Riichi
	if player.IsRiichi {
		return actions
	}

	// Check Kong
	if mahjong.CanKong(player.Hand, discard) {
		actions = append(actions, mahjong.ActionKong)
	}

	// Check Pong
	if mahjong.CanPong(player.Hand, discard) {
		actions = append(actions, mahjong.ActionPong)
	}

	// Check Chow (only for next player)
	nextPlayer := (gs.LastDiscard.PlayerIndex + 1) % 4
	if playerIdx == nextPlayer && mahjong.CanChow(player.Hand, discard) {
		actions = append(actions, mahjong.ActionChow)
	}

	return actions
}

func (gs *GameState) HandleAction(playerIdx int, action mahjong.ActionType) error {
	player := gs.Players[playerIdx]

	switch action {
	case mahjong.ActionPass:
		player.AvailableActions = nil
		gs.checkResolveComplete()

	case mahjong.ActionPong:
		if gs.LastDiscard == nil {
			return ErrInvalidAction
		}
		gs.executePong(playerIdx)

	case mahjong.ActionKong:
		if gs.LastDiscard == nil {
			return ErrInvalidAction
		}
		gs.executeKong(playerIdx)

	case mahjong.ActionChow:
		if gs.LastDiscard == nil {
			return ErrInvalidAction
		}
		gs.executeChow(playerIdx)

	case mahjong.ActionHu:
		gs.executeHu(playerIdx)

	case mahjong.ActionRiichi:
		player.IsRiichi = true
		player.AvailableActions = nil
	}

	return nil
}

func (gs *GameState) executePong(playerIdx int) {
	player := gs.Players[playerIdx]
	discard := gs.LastDiscard.Tile
	fromPlayer := gs.LastDiscard.PlayerIndex

	// Remove matching tiles from hand
	removed := 0
	newHand := make([]*mahjong.Tile, 0)
	for _, tile := range player.Hand {
		if removed < 2 && tile.Suit == discard.Suit && tile.Value == discard.Value {
			removed++
			continue
		}
		newHand = append(newHand, tile)
	}
	player.Hand = newHand

	// Remove discard from source player
	sourcePlayer := gs.Players[fromPlayer]
	if len(sourcePlayer.Discards) > 0 {
		sourcePlayer.Discards = sourcePlayer.Discards[:len(sourcePlayer.Discards)-1]
	}

	// Add meld
	player.Melds = append(player.Melds, mahjong.Meld{
		Type:       mahjong.ActionPong,
		Tiles:      []*mahjong.Tile{discard, discard, discard},
		FromPlayer: fromPlayer,
	})

	gs.LastDiscard = nil
	gs.Phase = PhaseDiscard
	gs.CurrentTurn = playerIdx
	gs.clearAllActions()
}

func (gs *GameState) executeKong(playerIdx int) {
	player := gs.Players[playerIdx]
	discard := gs.LastDiscard.Tile
	fromPlayer := gs.LastDiscard.PlayerIndex

	// Remove matching tiles from hand
	removed := 0
	newHand := make([]*mahjong.Tile, 0)
	for _, tile := range player.Hand {
		if removed < 3 && tile.Suit == discard.Suit && tile.Value == discard.Value {
			removed++
			continue
		}
		newHand = append(newHand, tile)
	}
	player.Hand = newHand

	// Remove discard from source player
	sourcePlayer := gs.Players[fromPlayer]
	if len(sourcePlayer.Discards) > 0 {
		sourcePlayer.Discards = sourcePlayer.Discards[:len(sourcePlayer.Discards)-1]
	}

	// Add meld
	player.Melds = append(player.Melds, mahjong.Meld{
		Type:       mahjong.ActionKong,
		Tiles:      []*mahjong.Tile{discard, discard, discard, discard},
		FromPlayer: fromPlayer,
	})

	// Draw replacement tile
	replacement := gs.Deck.Draw()
	if replacement != nil {
		if replacement.Suit == mahjong.SuitFlowers {
			player.Flowers = append(player.Flowers, replacement)
			replacement = gs.Deck.Draw()
		}
		if replacement != nil {
			player.Hand = append(player.Hand, replacement)
		}
	}

	gs.LastDiscard = nil
	gs.Phase = PhaseDiscard
	gs.CurrentTurn = playerIdx
	gs.clearAllActions()
}

func (gs *GameState) executeChow(playerIdx int) {
	player := gs.Players[playerIdx]
	discard := gs.LastDiscard.Tile
	fromPlayer := gs.LastDiscard.PlayerIndex

	// Get chow combination
	combo := mahjong.GetChowCombination(player.Hand, discard)
	if combo == nil {
		return
	}

	// Remove tiles from hand
	for _, c := range combo {
		for i, tile := range player.Hand {
			if tile.Suit == c.Suit && tile.Value == c.Value {
				player.Hand = append(player.Hand[:i], player.Hand[i+1:]...)
				break
			}
		}
	}

	// Remove discard from source player
	sourcePlayer := gs.Players[fromPlayer]
	if len(sourcePlayer.Discards) > 0 {
		sourcePlayer.Discards = sourcePlayer.Discards[:len(sourcePlayer.Discards)-1]
	}

	// Sort meld tiles
	meldTiles := append(combo, discard)
	mahjong.SortTiles(meldTiles)

	// Add meld
	player.Melds = append(player.Melds, mahjong.Meld{
		Type:       mahjong.ActionChow,
		Tiles:      meldTiles,
		FromPlayer: fromPlayer,
	})

	gs.LastDiscard = nil
	gs.Phase = PhaseDiscard
	gs.CurrentTurn = playerIdx
	gs.clearAllActions()
}

func (gs *GameState) executeHu(playerIdx int) {
	player := gs.Players[playerIdx]
	player.IsWinner = true

	isZimo := gs.LastDiscard == nil || gs.LastDiscard.PlayerIndex == playerIdx

	if isZimo {
		gs.WinType = WinTypeZimo
	} else {
		gs.WinType = WinTypeRon
		// Add winning tile to hand for display
		if gs.LastDiscard != nil {
			player.Hand = append(player.Hand, gs.LastDiscard.Tile)
		}
	}

	// Calculate score
	gs.TaiCount = gs.calculateTai(playerIdx)
	baseScore := gs.Settings.BaseScore + (gs.Settings.TaiScore * gs.TaiCount)

	if isZimo {
		// All players pay
		player.ScoreDelta = baseScore * 3
		for i, p := range gs.Players {
			if i != playerIdx {
				p.ScoreDelta = -baseScore
			}
		}
	} else {
		// Only discarder pays
		loserIdx := gs.LastDiscard.PlayerIndex
		player.ScoreDelta = baseScore
		gs.Players[loserIdx].ScoreDelta = -baseScore
		gs.Players[loserIdx].IsLoser = true
	}

	player.TaiCount = gs.TaiCount
	gs.WinnerIndex = playerIdx
	gs.Phase = PhaseGameOver
	gs.clearAllActions()
}

func (gs *GameState) calculateTai(playerIdx int) int {
	// Simplified tai calculation - in real game this would be much more complex
	player := gs.Players[playerIdx]
	tai := 1

	// Flowers bonus
	tai += len(player.Flowers)

	// Self-draw bonus
	if gs.WinType == WinTypeZimo {
		tai++
	}

	// Dealer bonus
	if player.IsDealer {
		tai++
	}

	return tai
}

func (gs *GameState) NextTurn() {
	if gs.Deck.Remaining() == 0 {
		gs.endGameDraw()
		return
	}

	gs.CurrentTurn = (gs.CurrentTurn + 1) % 4
	player := gs.Players[gs.CurrentTurn]

	// Draw tile
	tile := gs.Deck.Draw()
	if tile == nil {
		gs.endGameDraw()
		return
	}

	// Handle flower
	if tile.Suit == mahjong.SuitFlowers {
		player.Flowers = append(player.Flowers, tile)
		tile = gs.Deck.Draw()
		if tile == nil {
			gs.endGameDraw()
			return
		}
	}

	player.Hand = append(player.Hand, tile)
	mahjong.SortTiles(player.Hand)

	gs.Phase = PhaseDiscard
	gs.LastDiscard = nil

	// Check for self-win
	if mahjong.CheckWin(player.Hand, player.Melds) {
		player.AvailableActions = []mahjong.ActionType{mahjong.ActionHu}
	}

	// Check for riichi
	if !player.IsRiichi && mahjong.CanRiichi(player.Hand, player.Melds) {
		player.AvailableActions = append(player.AvailableActions, mahjong.ActionRiichi)
	}
}

func (gs *GameState) endGameDraw() {
	gs.WinType = WinTypeDraw
	gs.Phase = PhaseGameOver
	gs.WinnerIndex = -1
}

func (gs *GameState) checkResolveComplete() {
	for _, p := range gs.Players {
		if len(p.AvailableActions) > 0 {
			return
		}
	}
	gs.NextTurn()
}

func (gs *GameState) clearAllActions() {
	for _, p := range gs.Players {
		p.AvailableActions = nil
	}
}

func (gs *GameState) ToDTO() map[string]interface{} {
	players := make([]map[string]interface{}, len(gs.Players))
	for i, p := range gs.Players {
		players[i] = map[string]interface{}{
			"info": map[string]interface{}{
				"id":                  p.Info.ID,
				"name":                p.Info.DisplayName,
				"score":               p.Score,
				"roundScoreDelta":     p.ScoreDelta,
				"isDealer":            p.IsDealer,
				"flowerCount":         len(p.Flowers),
				"flowers":             tilesToDTO(p.Flowers),
				"wind":                string(p.Wind),
				"seatWind":            string(p.SeatWind),
				"isRichii":            p.IsRiichi,
				"richiiDiscardIndex":  p.RiichiDiscardIdx,
				"isWinner":            p.IsWinner,
				"isLoser":             p.IsLoser,
				"tai":                 p.TaiCount,
			},
			"handCount":        len(p.Hand),
			"discards":         tilesToDTO(p.Discards),
			"melds":            meldsToDTO(p.Melds),
		}
	}

	dto := map[string]interface{}{
		"deckCount":        gs.Deck.Remaining(),
		"players":          players,
		"turn":             gs.CurrentTurn,
		"state":            string(gs.Phase),
		"actionTimer":      gs.ActionTimer,
		"availableActions": []string{},
	}

	if gs.LastDiscard != nil {
		dto["lastDiscard"] = map[string]interface{}{
			"tile":        gs.LastDiscard.Tile.ToDTO(),
			"playerIndex": gs.LastDiscard.PlayerIndex,
		}
	}

	if gs.InitData != nil {
		dto["initData"] = map[string]interface{}{
			"step":           gs.InitData.Step,
			"diceValues":     gs.InitData.DiceValues,
			"windAssignment": gs.InitData.WindAssignment,
		}
	}

	if gs.Phase == PhaseGameOver {
		dto["winnerIndex"] = gs.WinnerIndex
		dto["winType"] = string(gs.WinType)
	}

	return dto
}

func (gs *GameState) ToPersonalDTO(playerIdx int) map[string]interface{} {
	dto := gs.ToDTO()
	
	// Add personal hand
	players := dto["players"].([]map[string]interface{})
	players[playerIdx]["hand"] = tilesToDTO(gs.Players[playerIdx].Hand)
	
	// Add available actions
	dto["availableActions"] = actionsToStrings(gs.Players[playerIdx].AvailableActions)
	
	// Reveal all hands if game over
	if gs.Phase == PhaseGameOver {
		for i, p := range gs.Players {
			players[i]["hand"] = tilesToDTO(p.Hand)
		}
	}

	return dto
}

func actionsToStrings(actions []mahjong.ActionType) []string {
	result := make([]string, len(actions))
	for i, a := range actions {
		result[i] = string(a)
	}
	return result
}

