package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/victor/mahjong-backend/pkg/response"
)

type Claims struct {
	UserID      uint   `json:"user_id"`
	Username    string `json:"username,omitempty"`
	DisplayName string `json:"display_name"`
	jwt.RegisteredClaims
}

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header is required")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := parts[1]

		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*Claims)
		if !ok || !token.Valid {
			response.Unauthorized(c, "Invalid token claims")
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("displayName", claims.DisplayName)

		c.Next()
	}
}
