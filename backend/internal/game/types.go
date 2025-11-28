package game

// GameClient represents a client interface to avoid circular dependency with socket package
type GameClient interface {
	GetUserID() uint
	GetDisplayName() string
	GetPlayerIndex() int
	SetPlayerIndex(int)
	Send(event string, data interface{})
}

// GameHub represents a hub interface to avoid circular dependency with socket package
type GameHub interface {
	BroadcastToRoom(roomID, event string, data interface{})
	BroadcastToRoomExcept(roomID, event string, data interface{}, exclude interface{})
	JoinRoom(client interface{}, roomID string)
	LeaveRoom(client interface{}, roomID string)
}

