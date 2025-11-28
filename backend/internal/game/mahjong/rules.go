package mahjong

// CheckWin checks if the hand is a winning hand
func CheckWin(hand []*Tile, melds []Meld) bool {
	if len(hand) == 0 {
		return false
	}

	// Total tiles should be 14 (including melds)
	totalTiles := len(hand) + len(melds)*3
	if totalTiles != 14 && totalTiles != 17 { // 14 normal, 17 with kong
		// Allow checking with 1 extra for ron check
		if totalTiles != 15 && totalTiles != 18 {
			return false
		}
	}

	// Try to form valid groups
	return tryWin(CopyTiles(hand), 0, false)
}

func tryWin(tiles []*Tile, melds int, hasPair bool) bool {
	if len(tiles) == 0 {
		return hasPair
	}

	if len(tiles) == 2 && !hasPair {
		return tiles[0].Equal(tiles[1])
	}

	SortTiles(tiles)

	// Try pair
	if !hasPair && len(tiles) >= 2 {
		if tiles[0].Equal(tiles[1]) {
			remaining := CopyTiles(tiles[2:])
			if tryWin(remaining, melds, true) {
				return true
			}
		}
	}

	// Try triplet (Pong)
	if len(tiles) >= 3 {
		if tiles[0].Equal(tiles[1]) && tiles[1].Equal(tiles[2]) {
			remaining := CopyTiles(tiles[3:])
			if tryWin(remaining, melds+1, hasPair) {
				return true
			}
		}
	}

	// Try sequence (Chow) - only for numbered suits
	if len(tiles) >= 3 && isNumberedSuit(tiles[0].Suit) {
		seq := findSequence(tiles, tiles[0])
		if seq != nil {
			remaining := removeSequence(tiles, seq)
			if tryWin(remaining, melds+1, hasPair) {
				return true
			}
		}
	}

	return false
}

func isNumberedSuit(suit Suit) bool {
	return suit == SuitDots || suit == SuitBamboo || suit == SuitCharacters
}

func findSequence(tiles []*Tile, first *Tile) []*Tile {
	if !isNumberedSuit(first.Suit) || first.Value > 7 {
		return nil
	}

	second := findTile(tiles, first.Suit, first.Value+1)
	if second == nil {
		return nil
	}

	third := findTile(tiles, first.Suit, first.Value+2)
	if third == nil {
		return nil
	}

	return []*Tile{first, second, third}
}

func findTile(tiles []*Tile, suit Suit, value int) *Tile {
	for _, t := range tiles {
		if t.Suit == suit && t.Value == value {
			return t
		}
	}
	return nil
}

func removeSequence(tiles []*Tile, seq []*Tile) []*Tile {
	result := CopyTiles(tiles)
	for _, s := range seq {
		result = RemoveTile(result, s)
	}
	return result
}

// CanPong checks if player can pong with the discarded tile
func CanPong(hand []*Tile, discard *Tile) bool {
	count := CountTile(hand, discard)
	return count >= 2
}

// CanKong checks if player can kong with the discarded tile
func CanKong(hand []*Tile, discard *Tile) bool {
	count := CountTile(hand, discard)
	return count >= 3
}

// CanChow checks if player can chow with the discarded tile
func CanChow(hand []*Tile, discard *Tile) bool {
	if !isNumberedSuit(discard.Suit) {
		return false
	}

	value := discard.Value

	// Check X-1, X-2 (need value-1 and value-2)
	if value >= 3 {
		if hasTile(hand, discard.Suit, value-1) && hasTile(hand, discard.Suit, value-2) {
			return true
		}
	}

	// Check X-1, X+1 (need value-1 and value+1)
	if value >= 2 && value <= 8 {
		if hasTile(hand, discard.Suit, value-1) && hasTile(hand, discard.Suit, value+1) {
			return true
		}
	}

	// Check X+1, X+2 (need value+1 and value+2)
	if value <= 7 {
		if hasTile(hand, discard.Suit, value+1) && hasTile(hand, discard.Suit, value+2) {
			return true
		}
	}

	return false
}

func hasTile(hand []*Tile, suit Suit, value int) bool {
	for _, t := range hand {
		if t.Suit == suit && t.Value == value {
			return true
		}
	}
	return false
}

// GetChowCombination returns the tiles needed for chow (excluding discard)
func GetChowCombination(hand []*Tile, discard *Tile) []*Tile {
	if !isNumberedSuit(discard.Suit) {
		return nil
	}

	value := discard.Value

	// Try X-2, X-1 first
	if value >= 3 {
		t1 := findTile(hand, discard.Suit, value-2)
		t2 := findTile(hand, discard.Suit, value-1)
		if t1 != nil && t2 != nil {
			return []*Tile{t1, t2}
		}
	}

	// Try X-1, X+1
	if value >= 2 && value <= 8 {
		t1 := findTile(hand, discard.Suit, value-1)
		t2 := findTile(hand, discard.Suit, value+1)
		if t1 != nil && t2 != nil {
			return []*Tile{t1, t2}
		}
	}

	// Try X+1, X+2
	if value <= 7 {
		t1 := findTile(hand, discard.Suit, value+1)
		t2 := findTile(hand, discard.Suit, value+2)
		if t1 != nil && t2 != nil {
			return []*Tile{t1, t2}
		}
	}

	return nil
}

// CanRiichi checks if player can declare riichi (one tile away from winning)
func CanRiichi(hand []*Tile, melds []Meld) bool {
	waitingTiles := GetTenpaiWaitingTiles(hand, melds)
	return len(waitingTiles) > 0
}

// GetTenpaiWaitingTiles returns tiles that would complete the hand
func GetTenpaiWaitingTiles(hand []*Tile, melds []Meld) []*Tile {
	waiting := make([]*Tile, 0)

	// Try adding each possible tile
	allTiles := getAllPossibleTiles()
	for _, tile := range allTiles {
		testHand := append(CopyTiles(hand), tile)
		if CheckWin(testHand, melds) {
			waiting = append(waiting, tile)
		}
	}

	return waiting
}

func getAllPossibleTiles() []*Tile {
	tiles := make([]*Tile, 0)

	// Number tiles
	for _, suit := range []Suit{SuitDots, SuitBamboo, SuitCharacters} {
		for value := 1; value <= 9; value++ {
			tiles = append(tiles, NewTile(suit, value))
		}
	}

	// Wind tiles
	for value := 1; value <= 4; value++ {
		tiles = append(tiles, NewTile(SuitWinds, value))
	}

	// Dragon tiles
	for value := 1; value <= 3; value++ {
		tiles = append(tiles, NewTile(SuitDragons, value))
	}

	return tiles
}

