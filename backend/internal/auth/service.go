package auth

import (
	"github.com/victor/mahjong-backend/internal/user"
)

type Service interface {
	Register(input user.CreateUserInput) (*user.User, string, error)
	Login(input user.LoginInput) (*user.User, string, error)
	ValidateToken(tokenString string) (*Claims, error)
	GenerateToken(u *user.User) (string, error)
}

type service struct {
	userService user.Service
	jwtManager  *JWTManager
}

func NewService(userService user.Service, jwtSecret string, expirationHours int) Service {
	return &service{
		userService: userService,
		jwtManager:  NewJWTManager(jwtSecret, expirationHours),
	}
}

func (s *service) Register(input user.CreateUserInput) (*user.User, string, error) {
	u, err := s.userService.Create(input)
	if err != nil {
		return nil, "", err
	}

	username := ""
	if u.Username != nil {
		username = *u.Username
	}

	token, err := s.jwtManager.Generate(u.ID, username, u.DisplayName)
	if err != nil {
		return nil, "", err
	}

	return u, token, nil
}

func (s *service) Login(input user.LoginInput) (*user.User, string, error) {
	u, err := s.userService.ValidateCredentials(input.Username, input.Password)
	if err != nil {
		return nil, "", err
	}

	username := ""
	if u.Username != nil {
		username = *u.Username
	}

	token, err := s.jwtManager.Generate(u.ID, username, u.DisplayName)
	if err != nil {
		return nil, "", err
	}

	return u, token, nil
}

func (s *service) ValidateToken(tokenString string) (*Claims, error) {
	return s.jwtManager.Validate(tokenString)
}

func (s *service) GenerateToken(u *user.User) (string, error) {
	username := ""
	if u.Username != nil {
		username = *u.Username
	}
	return s.jwtManager.Generate(u.ID, username, u.DisplayName)
}

