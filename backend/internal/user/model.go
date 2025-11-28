package user

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	Username     *string        `gorm:"size:50;uniqueIndex" json:"username,omitempty"`
	Email        *string        `gorm:"size:100;uniqueIndex" json:"email,omitempty"`
	PasswordHash string         `gorm:"size:255" json:"-"`
	LineUserID   *string        `gorm:"size:100;uniqueIndex;column:line_user_id" json:"line_user_id,omitempty"`
	DisplayName  string         `gorm:"size:100;not null" json:"display_name"`
	AvatarURL    string         `gorm:"size:500" json:"avatar_url,omitempty"`
	TotalScore   int            `gorm:"default:0" json:"total_score"`
	TotalGames   int            `gorm:"default:0" json:"total_games"`
	TotalWins    int            `gorm:"default:0" json:"total_wins"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (User) TableName() string {
	return "users"
}

type PublicUser struct {
	ID          uint   `json:"id"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url,omitempty"`
	TotalScore  int    `json:"total_score"`
	TotalGames  int    `json:"total_games"`
	TotalWins   int    `json:"total_wins"`
}

func (u *User) ToPublic() PublicUser {
	return PublicUser{
		ID:          u.ID,
		DisplayName: u.DisplayName,
		AvatarURL:   u.AvatarURL,
		TotalScore:  u.TotalScore,
		TotalGames:  u.TotalGames,
		TotalWins:   u.TotalWins,
	}
}

type CreateUserInput struct {
	Username    string `json:"username" binding:"required,min=3,max=50"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	DisplayName string `json:"display_name" binding:"required,min=1,max=100"`
}

type UpdateUserInput struct {
	DisplayName string `json:"display_name" binding:"omitempty,min=1,max=100"`
	AvatarURL   string `json:"avatar_url" binding:"omitempty,url"`
}

type LoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}
