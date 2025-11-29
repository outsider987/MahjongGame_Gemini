package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/victor/mahjong-backend/internal/auth"
	"github.com/victor/mahjong-backend/internal/config"
	"github.com/victor/mahjong-backend/internal/game"
	"github.com/victor/mahjong-backend/internal/matchmaking"
	"github.com/victor/mahjong-backend/internal/record"
	"github.com/victor/mahjong-backend/internal/socket"
	"github.com/victor/mahjong-backend/internal/user"
	"github.com/victor/mahjong-backend/pkg/middleware"
	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Initialize logger
	zapLogger, _ := zap.NewProduction()
	defer zapLogger.Sync()
	sugar := zapLogger.Sugar()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	sugar.Infof("Config loaded. Database Host: %s, Port: %s", cfg.Database.Host, cfg.Database.Port)

	// Set Gin mode
	gin.SetMode(cfg.Server.Mode)

	// Initialize database
	db, err := gorm.Open(mysql.Open(cfg.Database.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate models
	if err := db.AutoMigrate(&user.User{}, &record.GameRecord{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	sugar.Info("Database migration completed")

	// Initialize repositories and services
	userRepo := user.NewRepository(db)
	userService := user.NewService(userRepo)
	recordRepo := record.NewRepository(db)

	// Initialize auth service
	authService := auth.NewService(userService, cfg.JWT.Secret, cfg.JWT.ExpirationHours)
	lineAuthService := auth.NewLINEService(cfg.LINE.ChannelID, cfg.LINE.ChannelSecret, cfg.LINE.CallbackURL)
	authHandler := auth.NewHandler(authService, lineAuthService, userService)

	// Initialize WebSocket hub
	hub := socket.NewHub()
	go hub.Run()

	// Initialize matchmaking queue
	matchQueue := matchmaking.NewQueue(hub)
	go matchQueue.Run()

	// Initialize room manager
	roomManager := game.NewRoomManager(hub, recordRepo)

	// Initialize socket handler
	socketHandler := socket.NewHandler(hub, roomManager, matchQueue, authService)

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.RequestLogger())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api")
	{
		// Auth routes
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
			authGroup.GET("/line/login", authHandler.LINELogin)
			authGroup.GET("/line/callback", func(c *gin.Context) { authHandler.LINECallback(c, cfg) })
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(cfg.JWT.Secret))
		{
			protected.GET("/user/profile", authHandler.GetProfile)
			protected.PUT("/user/profile", authHandler.UpdateProfile)
		}
	}

	// WebSocket endpoint
	r.GET("/ws", socketHandler.HandleWebSocket)

	// Start server
	addr := ":" + cfg.Server.Port
	sugar.Infof("Starting server on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
