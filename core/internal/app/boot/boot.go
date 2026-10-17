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
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db := database.Connect(ctx, cfg.DatabaseURL)
	defer database.MustClose(db)

	database.Migrate(ctx, db)
	database.SeedAdmin(ctx, db, cfg.AdminSeedUsername, cfg.AdminSeedPassword)
	database.SeedTicketCategories(ctx, db)

	handlers := dependencies.Wire(ctx, db, cfg)
	go handlers.UserPhotosService.Run(ctx)
	go handlers.PaymentsService.Run(ctx)
	r := router.New(cfg.BotToken, cfg.CORSAllowedOrigins, handlers)
	server.Run(cfg.Addr, r)
}
