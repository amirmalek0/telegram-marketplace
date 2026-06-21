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
	ctx := context.Background()

	db := database.Connect(ctx, cfg.DatabaseURL)
	defer database.MustClose(db)

	database.Migrate(ctx, db)
	database.SeedAdmin(ctx, db, cfg.AdminSeedUsername, cfg.AdminSeedPassword)

	handlers := dependencies.Wire(ctx, db, cfg)
	r := router.New(cfg.BotToken, handlers)
	server.Run(cfg.Addr, r)
}
