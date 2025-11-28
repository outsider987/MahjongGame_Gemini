package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")
)

type Claims struct {
	UserID      uint   `json:"user_id"`
	Username    string `json:"username,omitempty"`
	DisplayName string `json:"display_name"`
	jwt.RegisteredClaims
}

type JWTManager struct {
	secretKey       []byte
	expirationHours int
}

func NewJWTManager(secretKey string, expirationHours int) *JWTManager {
	return &JWTManager{
		secretKey:       []byte(secretKey),
		expirationHours: expirationHours,
	}
}

func (m *JWTManager) Generate(userID uint, username, displayName string) (string, error) {
	claims := &Claims{
		UserID:      userID,
		Username:    username,
		DisplayName: displayName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(m.expirationHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "mahjong-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secretKey)
}

func (m *JWTManager) Validate(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return m.secretKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

