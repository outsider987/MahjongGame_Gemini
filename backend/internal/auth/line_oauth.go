package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const (
	lineAuthURL  = "https://access.line.me/oauth2/v2.1/authorize"
	lineTokenURL = "https://api.line.me/oauth2/v2.1/token"
	lineUserURL  = "https://api.line.me/v2/profile"
)

var (
	ErrLINEAuthFailed = errors.New("LINE authentication failed")
)

type LINEService struct {
	channelID     string
	channelSecret string
	callbackURL   string
}

type LINETokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	IDToken      string `json:"id_token"`
}

type LINEUserProfile struct {
	UserID        string `json:"userId"`
	DisplayName   string `json:"displayName"`
	PictureURL    string `json:"pictureUrl"`
	StatusMessage string `json:"statusMessage"`
}

func NewLINEService(channelID, channelSecret, callbackURL string) *LINEService {
	return &LINEService{
		channelID:     channelID,
		channelSecret: channelSecret,
		callbackURL:   callbackURL,
	}
}

func (s *LINEService) GetAuthURL(state string) string {
	params := url.Values{}
	params.Add("response_type", "code")
	params.Add("client_id", s.channelID)
	params.Add("redirect_uri", s.callbackURL)
	params.Add("state", state)
	params.Add("scope", "profile openid")

	return lineAuthURL + "?" + params.Encode()
}

func (s *LINEService) ExchangeCodeForToken(code string) (*LINETokenResponse, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", s.callbackURL)
	data.Set("client_id", s.channelID)
	data.Set("client_secret", s.channelSecret)

	req, err := http.NewRequest("POST", lineTokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("%w: %s", ErrLINEAuthFailed, string(body))
	}

	var tokenResp LINETokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func (s *LINEService) GetUserProfile(accessToken string) (*LINEUserProfile, error) {
	req, err := http.NewRequest("GET", lineUserURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("%w: %s", ErrLINEAuthFailed, string(body))
	}

	var profile LINEUserProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, err
	}

	return &profile, nil
}

func (s *LINEService) IsConfigured() bool {
	return s.channelID != "" && s.channelSecret != ""
}

