package mahjong

import (
	"math/rand"
	"time"
)

type Deck struct {
	tiles []*Tile
}

func NewDeck() *Deck {
	tiles := make([]*Tile, 0, 144)

	// Number tiles: Dots, Bamboo, Characters (1-9, 4 copies each)
	for _, suit := range []Suit{SuitDots, SuitBamboo, SuitCharacters} {
		for value := 1; value <= 9; value++ {
			for copy := 0; copy < 4; copy++ {
				tiles = append(tiles, NewTile(suit, value))
			}
		}
	}

	// Wind tiles: East, South, West, North (4 copies each)
	for value := 1; value <= 4; value++ {
		for copy := 0; copy < 4; copy++ {
			tiles = append(tiles, NewTile(SuitWinds, value))
		}
	}

	// Dragon tiles: Red, Green, White (4 copies each)
	for value := 1; value <= 3; value++ {
		for copy := 0; copy < 4; copy++ {
			tiles = append(tiles, NewTile(SuitDragons, value))
		}
	}

	// Flower tiles: 8 unique flowers
	for value := 1; value <= 8; value++ {
		tiles = append(tiles, NewTile(SuitFlowers, value))
	}

	return &Deck{tiles: tiles}
}

func (d *Deck) Shuffle() {
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(d.tiles), func(i, j int) {
		d.tiles[i], d.tiles[j] = d.tiles[j], d.tiles[i]
	})
}

func (d *Deck) Draw() *Tile {
	if len(d.tiles) == 0 {
		return nil
	}
	tile := d.tiles[len(d.tiles)-1]
	d.tiles = d.tiles[:len(d.tiles)-1]
	return tile
}

func (d *Deck) DrawFromBottom() *Tile {
	if len(d.tiles) == 0 {
		return nil
	}
	tile := d.tiles[0]
	d.tiles = d.tiles[1:]
	return tile
}

func (d *Deck) Remaining() int {
	return len(d.tiles)
}

