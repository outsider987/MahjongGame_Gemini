package matchmaking

import (
	"sync"
	"time"
)

const (
	PlayersPerGame = 4
	MatchTimeout   = 30 * time.Second
)

type Queue struct {
	hub     MatchHub
	players []MatchClient
	mu      sync.Mutex
	notify  chan struct{}
}

func NewQueue(hub MatchHub) *Queue {
	return &Queue{
		hub:     hub,
		players: make([]MatchClient, 0),
		notify:  make(chan struct{}, 1),
	}
}

func (q *Queue) Run() {
	for range q.notify {
		q.tryMatch()
	}
}

func (q *Queue) Join(client MatchClient) {
	q.mu.Lock()
	defer q.mu.Unlock()

	// Check if already in queue
	for _, p := range q.players {
		if p.GetUserID() == client.GetUserID() {
			return
		}
	}

	q.players = append(q.players, client)

	// Notify match checker
	select {
	case q.notify <- struct{}{}:
	default:
	}
}

func (q *Queue) Leave(client MatchClient) {
	q.mu.Lock()
	defer q.mu.Unlock()

	for i, p := range q.players {
		if p.GetUserID() == client.GetUserID() {
			q.players = append(q.players[:i], q.players[i+1:]...)
			return
		}
	}
}

func (q *Queue) tryMatch() {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.players) < PlayersPerGame {
		return
	}

	// Take first 4 players
	matched := q.players[:PlayersPerGame]
	q.players = q.players[PlayersPerGame:]

	// Notify players of match found
	for _, client := range matched {
		client.Send("matchmaking:found", map[string]interface{}{
			"message": "Match found! Starting game...",
		})
	}

	// Create room via callback (will be handled by room manager)
	go q.createMatch(matched)
}

func (q *Queue) createMatch(players []MatchClient) {
	// Small delay for client feedback
	time.Sleep(500 * time.Millisecond)

	// Notify hub to create a room with these players
	// This will be intercepted by room manager
	for _, client := range players {
		client.Send("matchmaking:ready", map[string]interface{}{
			"players": len(players),
		})
	}
}

func (q *Queue) GetQueueSize() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.players)
}
