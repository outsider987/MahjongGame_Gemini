package socket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 8192
)

type Client struct {
	hub         *Hub
	conn        *websocket.Conn
	send        chan *Message
	UserID      uint
	DisplayName string
	RoomID      string
	PlayerIndex int // -1 if not in a game
}

type Message struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

type IncomingMessage struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
}

func NewClient(hub *Hub, conn *websocket.Conn, userID uint, displayName string) *Client {
	return &Client{
		hub:         hub,
		conn:        conn,
		send:        make(chan *Message, 256),
		UserID:      userID,
		DisplayName: displayName,
		RoomID:      "",
		PlayerIndex: -1,
	}
}

func (c *Client) ReadPump(handler func(*Client, *IncomingMessage)) {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var msg IncomingMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Failed to parse message: %v", err)
			continue
		}

		handler(c, &msg)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			data, err := json.Marshal(message)
			if err != nil {
				log.Printf("Failed to marshal message: %v", err)
				continue
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) Send(event string, data interface{}) {
	select {
	case c.send <- &Message{Event: event, Data: data}:
	default:
		log.Printf("Client %d send buffer full", c.UserID)
	}
}

// Implement GameClient interface
func (c *Client) GetUserID() uint {
	return c.UserID
}

func (c *Client) GetDisplayName() string {
	return c.DisplayName
}

func (c *Client) GetPlayerIndex() int {
	return c.PlayerIndex
}

func (c *Client) SetPlayerIndex(idx int) {
	c.PlayerIndex = idx
}

