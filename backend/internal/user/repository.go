package user

import (
	"errors"

	"gorm.io/gorm"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
)

type Repository interface {
	Create(user *User) error
	FindByID(id uint) (*User, error)
	FindByUsername(username string) (*User, error)
	FindByEmail(email string) (*User, error)
	FindByLineUserID(lineUserID string) (*User, error)
	Update(user *User) error
	UpdateStats(userID uint, scoreDelta int, won bool) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(user *User) error {
	result := r.db.Create(user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrDuplicatedKey) {
			return ErrUserAlreadyExists
		}
		return result.Error
	}
	return nil
}

func (r *repository) FindByID(id uint) (*User, error) {
	var user User
	result := r.db.First(&user, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, result.Error
	}
	return &user, nil
}

func (r *repository) FindByUsername(username string) (*User, error) {
	var user User
	result := r.db.Where("username = ?", username).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, result.Error
	}
	return &user, nil
}

func (r *repository) FindByEmail(email string) (*User, error) {
	var user User
	result := r.db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, result.Error
	}
	return &user, nil
}

func (r *repository) FindByLineUserID(lineUserID string) (*User, error) {
	var user User
	result := r.db.Where("line_user_id = ?", lineUserID).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, result.Error
	}
	return &user, nil
}

func (r *repository) Update(user *User) error {
	return r.db.Save(user).Error
}

func (r *repository) UpdateStats(userID uint, scoreDelta int, won bool) error {
	updates := map[string]interface{}{
		"total_score": gorm.Expr("total_score + ?", scoreDelta),
		"total_games": gorm.Expr("total_games + 1"),
	}
	if won {
		updates["total_wins"] = gorm.Expr("total_wins + 1")
	}
	return r.db.Model(&User{}).Where("id = ?", userID).Updates(updates).Error
}
