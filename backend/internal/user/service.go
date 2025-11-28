package user

import (
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	Create(input CreateUserInput) (*User, error)
	CreateFromLINE(lineUserID, displayName, avatarURL string) (*User, error)
	GetByID(id uint) (*User, error)
	GetByUsername(username string) (*User, error)
	GetByLineUserID(lineUserID string) (*User, error)
	ValidateCredentials(username, password string) (*User, error)
	Update(userID uint, input UpdateUserInput) (*User, error)
	UpdateStats(userID uint, scoreDelta int, won bool) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Create(input CreateUserInput) (*User, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &User{
		Username:     &input.Username,
		Email:        &input.Email,
		PasswordHash: string(hashedPassword),
		DisplayName:  input.DisplayName,
	}

	if err := s.repo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *service) CreateFromLINE(lineUserID, displayName, avatarURL string) (*User, error) {
	user := &User{
		LineUserID:  &lineUserID,
		DisplayName: displayName,
		AvatarURL:   avatarURL,
	}

	if err := s.repo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *service) GetByID(id uint) (*User, error) {
	return s.repo.FindByID(id)
}

func (s *service) GetByUsername(username string) (*User, error) {
	return s.repo.FindByUsername(username)
}

func (s *service) GetByLineUserID(lineUserID string) (*User, error) {
	return s.repo.FindByLineUserID(lineUserID)
}

func (s *service) ValidateCredentials(username, password string) (*User, error) {
	user, err := s.repo.FindByUsername(username)
	if err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}

func (s *service) Update(userID uint, input UpdateUserInput) (*User, error) {
	user, err := s.repo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	if input.DisplayName != "" {
		user.DisplayName = input.DisplayName
	}
	if input.AvatarURL != "" {
		user.AvatarURL = input.AvatarURL
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *service) UpdateStats(userID uint, scoreDelta int, won bool) error {
	return s.repo.UpdateStats(userID, scoreDelta, won)
}
