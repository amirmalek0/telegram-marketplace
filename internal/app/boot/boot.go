package boot

import (
	"context"

	"telegram-marketplace/internal/app/config"
	"telegram-marketplace/internal/app/database"
	"telegram-marketplace/internal/app/dependencies"
	"telegram-marketplace/internal/app/router"
	"telegram-marketplace/internal/app/server"
)

// Start is the application entry point after config is loaded.
func Start(cfg config.Config) {
	db := database.Connect(context.Background(), cfg.DatabaseURL)
	defer database.MustClose(db)

	handlers := dependencies.Wire(db)
	r := router.New(cfg.BotToken, handlers)
	server.Run(cfg.Addr, r)
}
