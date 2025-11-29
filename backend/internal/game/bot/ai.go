package bot

import (
	"math/rand"
	"time"

	"github.com/victor/mahjong-backend/internal/game/mahjong"
)

// Bot represents an AI player
type Bot struct {
	difficulty string // "easy", "normal", "hard"
}

// NewBot creates a new bot with the specified difficulty
func NewBot(difficulty string) *Bot {
	return &Bot{difficulty: difficulty}
}

// DecideDiscard decides which tile to discard
func (b *Bot) DecideDiscard(hand []*mahjong.Tile) int {
	if len(hand) == 0 {
		return -1
	}

	rand.Seed(time.Now().UnixNano())

	switch b.difficulty {
	case "easy":
		return b.easyDiscard(hand)
	case "hard":
		return b.hardDiscard(hand)
	default:
		return b.normalDiscard(hand)
	}
}

func (b *Bot) easyDiscard(hand []*mahjong.Tile) int {
	// Just discard randomly
	return rand.Intn(len(hand))
}

func (b *Bot) normalDiscard(hand []*mahjong.Tile) int {
	// Prefer discarding isolated tiles
	mahjong.SortTiles(hand)

	// Count occurrences of each tile
	counts := make(map[string]int)
	for _, t := range hand {
		key := string(t.Suit) + string(rune(t.Value))
		counts[key]++
	}

	// Find isolated tiles (count = 1, no adjacent)
	for i, t := range hand {
		key := string(t.Suit) + string(rune(t.Value))
		if counts[key] == 1 {
			// Check if isolated (no adjacent tiles for numbered suits)
			if !isNumberedSuit(t.Suit) {
				return i
			}
			prevKey := string(t.Suit) + string(rune(t.Value-1))
			nextKey := string(t.Suit) + string(rune(t.Value+1))
			if counts[prevKey] == 0 && counts[nextKey] == 0 {
				return i
			}
		}
	}

	// Fallback: discard the last tile (usually the drawn one)
	return len(hand) - 1
}

func (b *Bot) hardDiscard(hand []*mahjong.Tile) int {
	// Advanced AI: Consider hand value and defense
	mahjong.SortTiles(hand)

	// Priority: Keep pairs and sequences, discard isolated tiles
	bestDiscard := -1
	bestScore := 1000

	for i, _ := range hand {
		score := b.evaluateTileValue(hand, i)
		if score < bestScore {
			bestScore = score
			bestDiscard = i
		}
	}

	if bestDiscard >= 0 {
		return bestDiscard
	}

	return len(hand) - 1
}

func (b *Bot) evaluateTileValue(hand []*mahjong.Tile, index int) int {
	tile := hand[index]
	score := 50 // Base score

	// Count matching tiles
	matches := 0
	for i, t := range hand {
		if i != index && t.Suit == tile.Suit && t.Value == tile.Value {
			matches++
		}
	}
	score -= matches * 30 // Pairs and triplets are valuable

	// Check for sequence potential (numbered suits only)
	if isNumberedSuit(tile.Suit) {
		adjacentCount := 0
		for i, t := range hand {
			if i != index && t.Suit == tile.Suit {
				diff := t.Value - tile.Value
				if diff >= -2 && diff <= 2 && diff != 0 {
					adjacentCount++
				}
			}
		}
		score -= adjacentCount * 15
	} else {
		// Honor tiles are valuable if paired
		if matches == 0 {
			score += 20 // Isolated honor tile
		}
	}

	// Terminal tiles (1 and 9) are less flexible
	if isNumberedSuit(tile.Suit) && (tile.Value == 1 || tile.Value == 9) {
		score += 10
	}

	return score
}

func isNumberedSuit(suit mahjong.Suit) bool {
	return suit == mahjong.SuitDots || suit == mahjong.SuitBamboo || suit == mahjong.SuitCharacters
}

// ShouldInteract decides whether to claim a discarded tile
func (b *Bot) ShouldInteract(action mahjong.ActionType, hand []*mahjong.Tile, discard *mahjong.Tile) bool {
	rand.Seed(time.Now().UnixNano())

	switch b.difficulty {
	case "easy":
		// Low chance to interact
		return rand.Float32() < 0.2
	case "hard":
		// Smart interaction based on hand value
		return b.shouldInteractHard(action, hand, discard)
	default:
		// Medium chance
		return rand.Float32() < 0.4
	}
}

func (b *Bot) shouldInteractHard(action mahjong.ActionType, hand []*mahjong.Tile, discard *mahjong.Tile) bool {
	switch action {
	case mahjong.ActionHu:
		return true // Always hu if possible
	case mahjong.ActionKong:
		return rand.Float32() < 0.7 // Usually kong
	case mahjong.ActionPong:
		// Pong if it helps complete the hand
		matches := mahjong.CountTile(hand, discard)
		return matches >= 2 && rand.Float32() < 0.6
	case mahjong.ActionChow:
		// Only chow if it really helps
		return rand.Float32() < 0.3
	}
	return false
}
