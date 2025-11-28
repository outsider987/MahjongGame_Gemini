package matchmaking

// MatchClient represents a client interface to avoid circular dependency
type MatchClient interface {
	GetUserID() uint
	Send(event string, data interface{})
}

// MatchHub represents a hub interface to avoid circular dependency
// For now, matchmaking doesn't need hub methods, so this is empty
type MatchHub interface {
}

