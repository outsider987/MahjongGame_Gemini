package game

import (
	"github.com/victor/mahjong-backend/internal/game/mahjong"
)

// PlayerState represents a player's current state in the game
type PlayerState struct {
	UserID          uint
	DisplayName     string
	Hand            []*mahjong.Tile
	Discards        []*mahjong.Tile
	Melds           []mahjong.Meld
	Flowers         []*mahjong.Tile
	Score           int
	ScoreDelta      int
	IsDealer        bool
	IsRiichi        bool
	RiichiDiscardIdx int
	Wind            mahjong.Wind
	SeatWind        mahjong.Wind
	IsConnected     bool
	IsBot           bool
}

// NewPlayerState creates a new player state
func NewPlayerState(userID uint, displayName string, isBot bool) *PlayerState {
	return &PlayerState{
		UserID:          userID,
		DisplayName:     displayName,
		Hand:            make([]*mahjong.Tile, 0),
		Discards:        make([]*mahjong.Tile, 0),
		Melds:           make([]mahjong.Meld, 0),
		Flowers:         make([]*mahjong.Tile, 0),
		Score:           0,
		ScoreDelta:      0,
		RiichiDiscardIdx: -1,
		IsConnected:     true,
		IsBot:           isBot,
	}
}

// Reset resets the player state for a new round
func (ps *PlayerState) Reset() {
	ps.Hand = make([]*mahjong.Tile, 0)
	ps.Discards = make([]*mahjong.Tile, 0)
	ps.Melds = make([]mahjong.Meld, 0)
	ps.Flowers = make([]*mahjong.Tile, 0)
	ps.ScoreDelta = 0
	ps.IsRiichi = false
	ps.RiichiDiscardIdx = -1
}

// AddTile adds a tile to the player's hand
func (ps *PlayerState) AddTile(tile *mahjong.Tile) {
	ps.Hand = append(ps.Hand, tile)
}

// RemoveTile removes a tile from the player's hand by index
func (ps *PlayerState) RemoveTile(index int) *mahjong.Tile {
	if index < 0 || index >= len(ps.Hand) {
		return nil
	}
	tile := ps.Hand[index]
	ps.Hand = append(ps.Hand[:index], ps.Hand[index+1:]...)
	return tile
}

// AddDiscard adds a tile to the discard pile
func (ps *PlayerState) AddDiscard(tile *mahjong.Tile) {
	ps.Discards = append(ps.Discards, tile)
}

// RemoveLastDiscard removes the last discarded tile
func (ps *PlayerState) RemoveLastDiscard() *mahjong.Tile {
	if len(ps.Discards) == 0 {
		return nil
	}
	tile := ps.Discards[len(ps.Discards)-1]
	ps.Discards = ps.Discards[:len(ps.Discards)-1]
	return tile
}

// AddMeld adds a meld to the player
func (ps *PlayerState) AddMeld(meld mahjong.Meld) {
	ps.Melds = append(ps.Melds, meld)
}

// AddFlower adds a flower tile
func (ps *PlayerState) AddFlower(tile *mahjong.Tile) {
	ps.Flowers = append(ps.Flowers, tile)
}

// SortHand sorts the player's hand
func (ps *PlayerState) SortHand() {
	mahjong.SortTiles(ps.Hand)
}

// HandCount returns the number of tiles in hand
func (ps *PlayerState) HandCount() int {
	return len(ps.Hand)
}

// FlowerCount returns the number of flower tiles
func (ps *PlayerState) FlowerCount() int {
	return len(ps.Flowers)
}

// ToDTO converts player state to DTO for frontend
func (ps *PlayerState) ToDTO(revealHand bool) map[string]interface{} {
	dto := map[string]interface{}{
		"info": map[string]interface{}{
			"id":                 ps.UserID,
			"name":               ps.DisplayName,
			"score":              ps.Score,
			"roundScoreDelta":    ps.ScoreDelta,
			"isDealer":           ps.IsDealer,
			"flowerCount":        ps.FlowerCount(),
			"flowers":            tilesToDTO(ps.Flowers),
			"wind":               string(ps.Wind),
			"seatWind":           string(ps.SeatWind),
			"isRichii":           ps.IsRiichi,
			"richiiDiscardIndex": ps.RiichiDiscardIdx,
		},
		"handCount": ps.HandCount(),
		"discards":  tilesToDTO(ps.Discards),
		"melds":     meldsToDTO(ps.Melds),
	}

	if revealHand {
		dto["hand"] = tilesToDTO(ps.Hand)
	}

	return dto
}

func tilesToDTO(tiles []*mahjong.Tile) []map[string]interface{} {
	result := make([]map[string]interface{}, len(tiles))
	for i, t := range tiles {
		result[i] = t.ToDTO()
	}
	return result
}

func meldsToDTO(melds []mahjong.Meld) []map[string]interface{} {
	result := make([]map[string]interface{}, len(melds))
	for i, m := range melds {
		result[i] = map[string]interface{}{
			"type":       string(m.Type),
			"tiles":      tilesToDTO(m.Tiles),
			"fromPlayer": m.FromPlayer,
		}
	}
	return result
}

