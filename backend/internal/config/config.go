package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	LINE     LINEConfig
}

type ServerConfig struct {
	Port string
	Mode string // debug, release, test
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

type JWTConfig struct {
	Secret          string
	ExpirationHours int
}

type LINEConfig struct {
	ChannelID     string
	ChannelSecret string
	CallbackURL   string
}

func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		d.User, d.Password, d.Host, d.Port, d.Name)
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	// Environment variable support
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	// Set defaults
	viper.SetDefault("server.port", "8080")
	viper.SetDefault("server.mode", "debug")
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", "3306")
	viper.SetDefault("database.user", "mahjong")
	viper.SetDefault("database.password", "mahjong_secret")
	viper.SetDefault("database.name", "mahjong_db")
	viper.SetDefault("jwt.secret", "your-super-secret-key-change-in-production")
	viper.SetDefault("jwt.expirationHours", 72)
	viper.SetDefault("line.channelId", "")
	viper.SetDefault("line.channelSecret", "")
	viper.SetDefault("line.callbackUrl", "http://localhost:8080/api/auth/line/callback")

	// Try to read config file (optional)
	_ = viper.ReadInConfig()

	// Bind environment variables explicitly
	viper.BindEnv("database.host", "DB_HOST")
	viper.BindEnv("database.port", "DB_PORT")
	viper.BindEnv("database.user", "DB_USER")
	viper.BindEnv("database.password", "DB_PASSWORD")
	viper.BindEnv("database.name", "DB_NAME")
	viper.BindEnv("jwt.secret", "JWT_SECRET")
	viper.BindEnv("line.channelId", "LINE_CHANNEL_ID")
	viper.BindEnv("line.channelSecret", "LINE_CHANNEL_SECRET")

	config := &Config{
		Server: ServerConfig{
			Port: viper.GetString("server.port"),
			Mode: viper.GetString("server.mode"),
		},
		Database: DatabaseConfig{
			Host:     viper.GetString("database.host"),
			Port:     viper.GetString("database.port"),
			User:     viper.GetString("database.user"),
			Password: viper.GetString("database.password"),
			Name:     viper.GetString("database.name"),
		},
		JWT: JWTConfig{
			Secret:          viper.GetString("jwt.secret"),
			ExpirationHours: viper.GetInt("jwt.expirationHours"),
		},
		LINE: LINEConfig{
			ChannelID:     viper.GetString("line.channelId"),
			ChannelSecret: viper.GetString("line.channelSecret"),
			CallbackURL:   viper.GetString("line.callbackUrl"),
		},
	}

	return config, nil
}

