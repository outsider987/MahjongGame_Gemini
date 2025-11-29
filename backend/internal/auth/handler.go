package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/victor/mahjong-backend/internal/config"
	"github.com/victor/mahjong-backend/internal/user"
	"github.com/victor/mahjong-backend/pkg/response"
)

type Handler struct {
	authService Service
	lineService *LINEService
	userService user.Service
	stateStore  map[string]bool // In production, use Redis
}

func NewHandler(authService Service, lineService *LINEService, userService user.Service) *Handler {
	return &Handler{
		authService: authService,
		lineService: lineService,
		userService: userService,
		stateStore:  make(map[string]bool),
	}
}

type AuthResponse struct {
	Token string          `json:"token"`
	User  user.PublicUser `json:"user"`
}

// Register handles user registration
func (h *Handler) Register(c *gin.Context) {
	var input user.CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	u, token, err := h.authService.Register(input)
	if err != nil {
		if errors.Is(err, user.ErrUserAlreadyExists) {
			response.BadRequest(c, "Username or email already exists")
			return
		}
		response.InternalServerError(c, "Failed to create user")
		return
	}

	response.Created(c, AuthResponse{
		Token: token,
		User:  u.ToPublic(),
	})
}

// Login handles user login
func (h *Handler) Login(c *gin.Context) {
	var input user.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	u, token, err := h.authService.Login(input)
	if err != nil {
		if errors.Is(err, user.ErrUserNotFound) {
			response.Unauthorized(c, "Invalid credentials")
			return
		}
		response.InternalServerError(c, "Failed to login")
		return
	}

	response.Success(c, AuthResponse{
		Token: token,
		User:  u.ToPublic(),
	})
}

// LINELogin initiates LINE OAuth flow
func (h *Handler) LINELogin(c *gin.Context) {
	if !h.lineService.IsConfigured() {
		response.BadRequest(c, "LINE login is not configured")
		return
	}

	// Generate random state
	stateBytes := make([]byte, 16)
	rand.Read(stateBytes)
	state := hex.EncodeToString(stateBytes)
	h.stateStore[state] = true

	authURL := h.lineService.GetAuthURL(state)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// LINECallback handles LINE OAuth callback
func (h *Handler) LINECallback(c *gin.Context, cfg *config.Config) {
	code := c.Query("code")
	state := c.Query("state")
	errorParam := c.Query("error")

	if errorParam != "" {
		response.BadRequest(c, "LINE authorization was denied")
		return
	}

	// Validate state
	if _, ok := h.stateStore[state]; !ok {
		response.BadRequest(c, "Invalid state parameter")
		return
	}
	delete(h.stateStore, state)

	// Exchange code for token
	tokenResp, err := h.lineService.ExchangeCodeForToken(code)
	if err != nil {
		response.InternalServerError(c, "Failed to exchange code for token")
		return
	}

	// Get user profile
	profile, err := h.lineService.GetUserProfile(tokenResp.AccessToken)
	if err != nil {
		response.InternalServerError(c, "Failed to get LINE profile")
		return
	}

	// Find or create user
	u, err := h.userService.GetByLineUserID(profile.UserID)
	if err != nil {
		if errors.Is(err, user.ErrUserNotFound) {
			u, err = h.userService.CreateFromLINE(
				profile.UserID,
				profile.DisplayName,
				profile.PictureURL,
			)
			if err != nil {
				response.InternalServerError(c, "Failed to create user")
				return
			}
		} else {
			response.InternalServerError(c, "Database error")
			return
		}
	}

	// Generate JWT token
	token, err := h.authService.GenerateToken(u)
	if err != nil {
		response.InternalServerError(c, "Failed to generate token")
		return
	}

	// Redirect to frontend
	redirectURL := cfg.Frontend.URL + "/line/callback?token=" + token
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

// GetProfile returns the current user's profile
func (h *Handler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "User not found in context")
		return
	}

	u, err := h.userService.GetByID(userID.(uint))
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	response.Success(c, u.ToPublic())
}

// UpdateProfile updates the current user's profile
func (h *Handler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "User not found in context")
		return
	}

	var input user.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	u, err := h.userService.Update(userID.(uint), input)
	if err != nil {
		response.InternalServerError(c, "Failed to update profile")
		return
	}

	response.Success(c, u.ToPublic())
}
