package mahjong

import (
	"fmt"
	"sort"
)

type Suit string

const (
	SuitDots       Suit = "DOTS"
	SuitBamboo     Suit = "BAMBOO"
	SuitCharacters Suit = "CHAR"
	SuitWinds      Suit = "WINDS"
	SuitDragons    Suit = "DRAGONS"
	SuitFlowers    Suit = "FLOWERS"
)

type Wind string

const (
	WindEast  Wind = "東"
	WindSouth Wind = "南"
	WindWest  Wind = "西"
	WindNorth Wind = "北"
)

type ActionType string

const (
	ActionPong   ActionType = "PONG"
	ActionKong   ActionType = "KONG"
	ActionChow   ActionType = "CHOW"
	ActionHu     ActionType = "HU"
	ActionPass   ActionType = "PASS"
	ActionRiichi ActionType = "RICHII"
)

type Tile struct {
	ID       string
	Suit     Suit
	Value    int
	IsFlower bool
}

type Meld struct {
	Type       ActionType
	Tiles      []*Tile
	FromPlayer int
}

func NewTile(suit Suit, value int) *Tile {
	return &Tile{
		ID:       fmt.Sprintf("%s_%d_%d", suit, value, generateID()),
		Suit:     suit,
		Value:    value,
		IsFlower: suit == SuitFlowers,
	}
}

var tileIDCounter int

func generateID() int {
	tileIDCounter++
	return tileIDCounter
}

func (t *Tile) ToDTO() map[string]interface{} {
	return map[string]interface{}{
		"id":       t.ID,
		"suit":     string(t.Suit),
		"value":    t.Value,
		"isFlower": t.IsFlower,
	}
}

func (t *Tile) Equal(other *Tile) bool {
	return t.Suit == other.Suit && t.Value == other.Value
}

func (t *Tile) SortKey() int {
	suitOrder := map[Suit]int{
		SuitDots:       0,
		SuitBamboo:     1,
		SuitCharacters: 2,
		SuitWinds:      3,
		SuitDragons:    4,
		SuitFlowers:    5,
	}
	return suitOrder[t.Suit]*100 + t.Value
}

func SortTiles(tiles []*Tile) {
	sort.Slice(tiles, func(i, j int) bool {
		return tiles[i].SortKey() < tiles[j].SortKey()
	})
}

func CountTile(tiles []*Tile, target *Tile) int {
	count := 0
	for _, t := range tiles {
		if t.Suit == target.Suit && t.Value == target.Value {
			count++
		}
	}
	return count
}

func RemoveTile(tiles []*Tile, target *Tile) []*Tile {
	for i, t := range tiles {
		if t.Suit == target.Suit && t.Value == target.Value {
			return append(tiles[:i], tiles[i+1:]...)
		}
	}
	return tiles
}

func CopyTiles(tiles []*Tile) []*Tile {
	result := make([]*Tile, len(tiles))
	copy(result, tiles)
	return result
}
