package mahjong

// ScoreResult contains the scoring breakdown
type ScoreResult struct {
	TaiCount    int
	BasePoints  int
	TotalPoints int
	Breakdown   []ScoreItem
}

type ScoreItem struct {
	Name   string
	TaiValue int
}

// CalculateScore calculates the score for a winning hand
func CalculateScore(hand []*Tile, melds []Meld, flowers []*Tile, winTile *Tile, isZimo bool, isDealer bool, seatWind Wind, roundWind Wind) ScoreResult {
	result := ScoreResult{
		Breakdown: make([]ScoreItem, 0),
	}

	// Base tai
	result.TaiCount = 1
	result.Breakdown = append(result.Breakdown, ScoreItem{Name: "基本台", TaiValue: 1})

	// Self-draw bonus
	if isZimo {
		result.TaiCount++
		result.Breakdown = append(result.Breakdown, ScoreItem{Name: "自摸", TaiValue: 1})
	}

	// Dealer bonus
	if isDealer {
		result.TaiCount++
		result.Breakdown = append(result.Breakdown, ScoreItem{Name: "莊家", TaiValue: 1})
	}

	// Flower bonus (1 tai per flower)
	if len(flowers) > 0 {
		result.TaiCount += len(flowers)
		result.Breakdown = append(result.Breakdown, ScoreItem{Name: "花牌", TaiValue: len(flowers)})
	}

	// Check for special hands
	if isPureHand(hand, melds) {
		result.TaiCount += 4
		result.Breakdown = append(result.Breakdown, ScoreItem{Name: "清一色", TaiValue: 4})
	} else if isHalfPure(hand, melds) {
		result.TaiCount += 2
		result.Breakdown = append(result.Breakdown, ScoreItem{Name: "混一色", TaiValue: 2})
	}

	if isAllPongs(hand, melds) {
		result.TaiCount += 2
		result.Breakdown = append(result.Breakdown, ScoreItem{Name: "對對胡", TaiValue: 2})
	}

	// Check for triplets of winds/dragons
	windDragonTai := countWindDragonTai(melds, seatWind, roundWind)
	if windDragonTai > 0 {
		result.TaiCount += windDragonTai
		result.Breakdown = append(result.Breakdown, ScoreItem{Name: "番牌", TaiValue: windDragonTai})
	}

	// Kong bonus
	kongCount := countKongs(melds)
	if kongCount > 0 {
		result.TaiCount += kongCount
		result.Breakdown = append(result.Breakdown, ScoreItem{Name: "槓", TaiValue: kongCount})
	}

	return result
}

func isPureHand(hand []*Tile, melds []Meld) bool {
	if len(hand) == 0 {
		return false
	}

	suit := Suit("")
	for _, t := range hand {
		if t.Suit == SuitFlowers {
			continue
		}
		if !isNumberedSuit(t.Suit) {
			return false
		}
		if suit == "" {
			suit = t.Suit
		} else if suit != t.Suit {
			return false
		}
	}

	for _, m := range melds {
		for _, t := range m.Tiles {
			if !isNumberedSuit(t.Suit) {
				return false
			}
			if suit != "" && suit != t.Suit {
				return false
			}
		}
	}

	return suit != ""
}

func isHalfPure(hand []*Tile, melds []Meld) bool {
	if len(hand) == 0 {
		return false
	}

	suit := Suit("")
	hasHonor := false

	for _, t := range hand {
		if t.Suit == SuitFlowers {
			continue
		}
		if !isNumberedSuit(t.Suit) {
			hasHonor = true
			continue
		}
		if suit == "" {
			suit = t.Suit
		} else if suit != t.Suit {
			return false
		}
	}

	for _, m := range melds {
		for _, t := range m.Tiles {
			if !isNumberedSuit(t.Suit) {
				hasHonor = true
				continue
			}
			if suit != "" && suit != t.Suit {
				return false
			}
		}
	}

	return suit != "" && hasHonor
}

func isAllPongs(hand []*Tile, melds []Meld) bool {
	// Check melds are all pongs/kongs
	for _, m := range melds {
		if m.Type == ActionChow {
			return false
		}
	}

	// Check remaining hand forms pongs + pair
	SortTiles(hand)
	
	if len(hand) < 2 {
		return true
	}

	// Simple check: all tiles should come in pairs or triplets
	counts := make(map[string]int)
	for _, t := range hand {
		key := string(t.Suit) + string(rune(t.Value))
		counts[key]++
	}

	pairFound := false
	for _, count := range counts {
		if count == 2 {
			if pairFound {
				return false // Multiple pairs not allowed in all-pong
			}
			pairFound = true
		} else if count != 3 {
			return false
		}
	}

	return true
}

func countWindDragonTai(melds []Meld, seatWind, roundWind Wind) int {
	tai := 0

	windValues := map[Wind]int{
		WindEast:  1,
		WindSouth: 2,
		WindWest:  3,
		WindNorth: 4,
	}

	seatWindValue := windValues[seatWind]
	roundWindValue := windValues[roundWind]

	for _, m := range melds {
		if m.Type != ActionPong && m.Type != ActionKong {
			continue
		}

		if len(m.Tiles) == 0 {
			continue
		}

		tile := m.Tiles[0]

		// Dragons always worth 1 tai
		if tile.Suit == SuitDragons {
			tai++
		}

		// Winds
		if tile.Suit == SuitWinds {
			if tile.Value == seatWindValue {
				tai++
			}
			if tile.Value == roundWindValue {
				tai++
			}
		}
	}

	return tai
}

func countKongs(melds []Meld) int {
	count := 0
	for _, m := range melds {
		if m.Type == ActionKong {
			count++
		}
	}
	return count
}

