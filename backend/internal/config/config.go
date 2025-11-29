package config

import (
	"log"
	"os"
	"strconv"

	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	LINE     LINEConfig     `mapstructure:"line"`
}

func (d *DatabaseConfig) DSN() string {
	return d.User + ":" + d.Password + "@tcp(" + d.Host + ":" + d.Port + ")/" + d.Name +
		"?charset=utf8mb4&parseTime=True&loc=Local"
}

type ServerConfig struct {
	Port string `mapstructure:"port"`
	Mode string `mapstructure:"mode"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Name     string `mapstructure:"name"`
}

type JWTConfig struct {
	Secret          string `mapstructure:"secret"`
	ExpirationHours int    `mapstructure:"expirationHours"`
}

type LINEConfig struct {
	ChannelID     string `mapstructure:"channelId"`
	ChannelSecret string `mapstructure:"channelSecret"`
	CallbackURL   string `mapstructure:"callbackUrl"`
}

var globalConfig *Config

// Load returns cached config or initializes one
func Load() (*Config, error) {
	if globalConfig != nil {
		return globalConfig, nil
	}

	v := viper.New()
	v.SetConfigName("config")
	v.SetConfigType("yaml")

	// search possible locations

	v.AddConfigPath(".")      // root
	v.AddConfigPath("../../") // backend root

	v.AddConfigPath("/app") // docker image
	// v.AddConfigPath("/etc/mahjong/") // optional server path

	// read config.yaml if exists
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Printf("⚠️ No config.yaml found, using env + defaults")
		} else {
			log.Printf("❌ Failed to parse config file: %v", err)
		}
	}

	cfg := &Config{}

	if err := v.Unmarshal(cfg); err != nil {
		return nil, err
	}

	applyEnvOverrides(cfg)
	applyDefaults(cfg)

	// ---------------------
	// 🔥 Hot Reload Enabled
	// ---------------------
	v.WatchConfig()
	v.OnConfigChange(func(e fsnotify.Event) {
		log.Println("🔄 config.yaml changed → reloading")

		if err := v.Unmarshal(cfg); err != nil {
			log.Printf("⚠️ Reload error: %v", err)
		} else {
			log.Println("✓ Config reloaded")
		}
	})

	globalConfig = cfg
	return cfg, nil
}

// Apply env vars on top of file config
func applyEnvOverrides(cfg *Config) {
	override := func(target *string, key string) {
		if val, ok := os.LookupEnv(key); ok {
			*target = val
		}
	}

	override(&cfg.Server.Port, "SERVER_PORT")
	override(&cfg.Server.Mode, "SERVER_MODE")

	override(&cfg.Database.Host, "DB_HOST")
	override(&cfg.Database.Port, "DB_PORT")
	override(&cfg.Database.User, "DB_USER")
	override(&cfg.Database.Password, "DB_PASSWORD")
	override(&cfg.Database.Name, "DB_NAME")

	override(&cfg.JWT.Secret, "JWT_SECRET")

	if val, ok := os.LookupEnv("JWT_EXPIRATION_HOURS"); ok {
		if n, err := strconv.Atoi(val); err == nil {
			cfg.JWT.ExpirationHours = n
		}
	}

	override(&cfg.LINE.ChannelID, "LINE_CHANNEL_ID")
	override(&cfg.LINE.ChannelSecret, "LINE_CHANNEL_SECRET")
	override(&cfg.LINE.CallbackURL, "LINE_CALLBACK_URL")
}

// default values when missing
func applyDefaults(cfg *Config) {
	if cfg.Server.Port == "" {
		cfg.Server.Port = "8080"
	}
	if cfg.Server.Mode == "" {
		cfg.Server.Mode = "debug"
	}

	if cfg.Database.Host == "" {
		cfg.Database.Host = "localhost"
	}
	if cfg.Database.Port == "" {
		cfg.Database.Port = "3306"
	}
	if cfg.Database.User == "" {
		cfg.Database.User = "mahjong"
	}
	if cfg.Database.Password == "" {
		cfg.Database.Password = "mahjong_secret"
	}
	if cfg.Database.Name == "" {
		cfg.Database.Name = "mahjong_db"
	}

	if cfg.JWT.Secret == "" {
		cfg.JWT.Secret = "replace-me"
	}
	if cfg.JWT.ExpirationHours == 0 {
		cfg.JWT.ExpirationHours = 72
	}

	if cfg.LINE.CallbackURL == "" {
		cfg.LINE.CallbackURL = "http://localhost:8080/api/auth/line/callback"
	}
}
