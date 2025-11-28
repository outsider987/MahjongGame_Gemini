package record

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type WinType string

const (
	WinTypeZimo WinType = "ZIMO"
	WinTypeRon  WinType = "RON"
	WinTypeDraw WinType = "DRAW"
)

type PlayerData struct {
	UserID     uint   `json:"user_id"`
	PlayerName string `json:"player_name"`
	ScoreDelta int    `json:"score_delta"`
	IsWinner   bool   `json:"is_winner"`
	IsDealer   bool   `json:"is_dealer"`
	TaiCount   int    `json:"tai_count,omitempty"`
}

type PlayersJSON []PlayerData

func (p PlayersJSON) Value() (driver.Value, error) {
	return json.Marshal(p)
}

func (p *PlayersJSON) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, p)
}

type GameRecord struct {
	ID         uint        `gorm:"primarykey" json:"id"`
	RoomID     string      `gorm:"size:20;not null;index" json:"room_id"`
	WinnerID   *uint       `gorm:"index" json:"winner_id,omitempty"`
	WinType    WinType     `gorm:"type:enum('ZIMO','RON','DRAW');not null" json:"win_type"`
	TaiCount   int         `gorm:"default:0" json:"tai_count"`
	PlayerData PlayersJSON `gorm:"type:json;not null" json:"player_data"`
	CreatedAt  time.Time   `json:"created_at"`
}

func (GameRecord) TableName() string {
	return "game_records"
}
