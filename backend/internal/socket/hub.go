package socket

import (
	"sync"
)

type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Clients by user ID
	userClients map[uint]*Client

	// Clients by room ID
	roomClients map[string]map[*Client]bool

	// Register requests
	register chan *Client

	// Unregister requests
	unregister chan *Client

	// Broadcast to specific room
	roomBroadcast chan *RoomMessage

	// Mutex for thread safety
	mu sync.RWMutex
}

type RoomMessage struct {
	RoomID  string
	Event   string
	Data    interface{}
	Exclude *Client // Client to exclude from broadcast
}

func NewHub() *Hub {
	return &Hub{
		clients:       make(map[*Client]bool),
		userClients:   make(map[uint]*Client),
		roomClients:   make(map[string]map[*Client]bool),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		roomBroadcast: make(chan *RoomMessage, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.userClients[client.UserID] = client
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				delete(h.userClients, client.UserID)

				// Remove from rooms
				for roomID, clients := range h.roomClients {
					if _, inRoom := clients[client]; inRoom {
						delete(clients, client)
						if len(clients) == 0 {
							delete(h.roomClients, roomID)
						}
					}
				}

				close(client.send)
			}
			h.mu.Unlock()

		case msg := <-h.roomBroadcast:
			h.mu.RLock()
			if clients, ok := h.roomClients[msg.RoomID]; ok {
				for client := range clients {
					if msg.Exclude != nil && client == msg.Exclude {
						continue
					}
					select {
					case client.send <- &Message{Event: msg.Event, Data: msg.Data}:
					default:
						// Client buffer full, skip
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) JoinRoom(client interface{}, roomID string) {
	c, ok := client.(*Client)
	if !ok {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.roomClients[roomID]; !ok {
		h.roomClients[roomID] = make(map[*Client]bool)
	}
	h.roomClients[roomID][c] = true
	c.RoomID = roomID
}

func (h *Hub) LeaveRoom(client interface{}, roomID string) {
	c, ok := client.(*Client)
	if !ok {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.roomClients[roomID]; ok {
		delete(clients, c)
		if len(clients) == 0 {
			delete(h.roomClients, roomID)
		}
	}
	c.RoomID = ""
}

func (h *Hub) BroadcastToRoom(roomID, event string, data interface{}) {
	h.roomBroadcast <- &RoomMessage{
		RoomID: roomID,
		Event:  event,
		Data:   data,
	}
}

func (h *Hub) BroadcastToRoomExcept(roomID, event string, data interface{}, exclude interface{}) {
	var excludeClient *Client
	if exclude != nil {
		if c, ok := exclude.(*Client); ok {
			excludeClient = c
		}
	}
	h.roomBroadcast <- &RoomMessage{
		RoomID:  roomID,
		Event:   event,
		Data:    data,
		Exclude: excludeClient,
	}
}

func (h *Hub) SendToClient(client *Client, event string, data interface{}) {
	select {
	case client.send <- &Message{Event: event, Data: data}:
	default:
		// Client buffer full
	}
}

func (h *Hub) SendToUser(userID uint, event string, data interface{}) {
	h.mu.RLock()
	client, ok := h.userClients[userID]
	h.mu.RUnlock()

	if ok {
		h.SendToClient(client, event, data)
	}
}

func (h *Hub) GetRoomClients(roomID string) []*Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var clients []*Client
	if roomClients, ok := h.roomClients[roomID]; ok {
		for client := range roomClients {
			clients = append(clients, client)
		}
	}
	return clients
}

func (h *Hub) GetRoomClientCount(roomID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, ok := h.roomClients[roomID]; ok {
		return len(clients)
	}
	return 0
}
