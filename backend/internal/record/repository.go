package record

import (
	"gorm.io/gorm"
)

type Repository interface {
	Create(record *GameRecord) error
	FindByRoomID(roomID string) ([]GameRecord, error)
	FindByUserID(userID uint, limit int) ([]GameRecord, error)
	GetUserStats(userID uint) (totalGames int64, totalWins int64, err error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(record *GameRecord) error {
	return r.db.Create(record).Error
}

func (r *repository) FindByRoomID(roomID string) ([]GameRecord, error) {
	var records []GameRecord
	err := r.db.Where("room_id = ?", roomID).Order("created_at DESC").Find(&records).Error
	return records, err
}

func (r *repository) FindByUserID(userID uint, limit int) ([]GameRecord, error) {
	var records []GameRecord
	query := r.db.Where("JSON_CONTAINS(player_data, ?)", 
		`{"user_id": `+string(rune(userID))+`}`).
		Order("created_at DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&records).Error
	return records, err
}

func (r *repository) GetUserStats(userID uint) (totalGames int64, totalWins int64, err error) {
	// Count total games
	err = r.db.Model(&GameRecord{}).
		Where("JSON_CONTAINS(player_data, ?)", 
			`{"user_id": `+string(rune(userID))+`}`).
		Count(&totalGames).Error
	if err != nil {
		return 0, 0, err
	}

	// Count wins
	err = r.db.Model(&GameRecord{}).
		Where("winner_id = ?", userID).
		Count(&totalWins).Error
	if err != nil {
		return 0, 0, err
	}

	return totalGames, totalWins, nil
}

