package socket

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/victor/mahjong-backend/internal/auth"
	"github.com/victor/mahjong-backend/internal/game"
	"github.com/victor/mahjong-backend/internal/matchmaking"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

type Handler struct {
	hub         *Hub
	roomManager *game.RoomManager
	matchQueue  *matchmaking.Queue
	authService auth.Service
}

func NewHandler(hub *Hub, roomManager *game.RoomManager, matchQueue *matchmaking.Queue, authService auth.Service) *Handler {
	return &Handler{
		hub:         hub,
		roomManager: roomManager,
		matchQueue:  matchQueue,
		authService: authService,
	}
}

func (h *Handler) HandleWebSocket(c *gin.Context) {
	// Get token from query
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
		return
	}

	// Validate token
	claims, err := h.authService.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	client := NewClient(h.hub, conn, claims.UserID, claims.DisplayName)
	h.hub.register <- client

	// Send connection confirmation
	client.Send("connected", map[string]interface{}{
		"user_id":      claims.UserID,
		"display_name": claims.DisplayName,
	})

	// Start pumps
	go client.WritePump()
	go client.ReadPump(h.handleMessage)
}

func (h *Handler) handleMessage(client *Client, msg *IncomingMessage) {
	switch msg.Event {
	case "action:join":
		h.handleJoin(client, msg.Data)

	case "action:quickmatch":
		h.handleQuickMatch(client)

	case "action:create_room":
		h.handleCreateRoom(client, msg.Data)

	case "action:discard":
		h.handleDiscard(client, msg.Data)

	case "action:operate":
		h.handleOperate(client, msg.Data)

	case "game:restart":
		h.handleRestart(client)

	case "action:leave":
		h.handleLeave(client)

	default:
		log.Printf("Unknown event: %s", msg.Event)
	}
}

func (h *Handler) handleJoin(client *Client, data json.RawMessage) {
	var req struct {
		RoomID string `json:"roomId"`
	}
	if err := json.Unmarshal(data, &req); err != nil {
		client.Send("game:error", "Invalid join request")
		return
	}

	room := h.roomManager.GetRoom(req.RoomID)
	if room == nil {
		client.Send("game:error", "Room not found")
		return
	}

	if err := room.AddPlayer(client); err != nil {
		client.Send("game:error", err.Error())
		return
	}

	h.hub.JoinRoom(client, req.RoomID)
}

func (h *Handler) handleQuickMatch(client *Client) {
	h.matchQueue.Join(client)
	client.Send("matchmaking:joined", map[string]interface{}{
		"message": "Looking for opponents...",
	})
}

func (h *Handler) handleCreateRoom(client *Client, data json.RawMessage) {
	var req struct {
		BaseScore int `json:"baseScore"`
		TaiScore  int `json:"taiScore"`
		Rounds    int `json:"rounds"`
	}
	if err := json.Unmarshal(data, &req); err != nil {
		req.BaseScore = 100
		req.TaiScore = 20
		req.Rounds = 1
	}

	room := h.roomManager.CreateRoom(game.RoomSettings{
		BaseScore: req.BaseScore,
		TaiScore:  req.TaiScore,
		Rounds:    req.Rounds,
	})

	if err := room.AddPlayer(client); err != nil {
		client.Send("game:error", err.Error())
		return
	}

	h.hub.JoinRoom(client, room.ID)

	client.Send("room:created", map[string]interface{}{
		"room_id": room.ID,
	})
}

func (h *Handler) handleDiscard(client *Client, data json.RawMessage) {
	if client.RoomID == "" {
		client.Send("game:error", "Not in a room")
		return
	}

	var req struct {
		TileIndex int `json:"tileIndex"`
	}
	if err := json.Unmarshal(data, &req); err != nil {
		client.Send("game:error", "Invalid discard request")
		return
	}

	room := h.roomManager.GetRoom(client.RoomID)
	if room == nil {
		client.Send("game:error", "Room not found")
		return
	}

	room.HandleDiscard(client, req.TileIndex)
}

func (h *Handler) handleOperate(client *Client, data json.RawMessage) {
	if client.RoomID == "" {
		client.Send("game:error", "Not in a room")
		return
	}

	var req struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(data, &req); err != nil {
		client.Send("game:error", "Invalid operation request")
		return
	}

	room := h.roomManager.GetRoom(client.RoomID)
	if room == nil {
		client.Send("game:error", "Room not found")
		return
	}

	room.HandleOperation(client, req.Action)
}

func (h *Handler) handleRestart(client *Client) {
	if client.RoomID == "" {
		client.Send("game:error", "Not in a room")
		return
	}

	room := h.roomManager.GetRoom(client.RoomID)
	if room == nil {
		client.Send("game:error", "Room not found")
		return
	}

	room.Restart()
}

func (h *Handler) handleLeave(client *Client) {
	if client.RoomID == "" {
		return
	}

	room := h.roomManager.GetRoom(client.RoomID)
	if room != nil {
		room.RemovePlayer(client)
	}

	h.hub.LeaveRoom(client, client.RoomID)
	client.Send("room:left", nil)
}

