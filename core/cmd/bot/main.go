package main

import (
	"context"
	"log"

	"telegram-marketplace/internal/app/config"
	"telegram-marketplace/internal/app/database"
	"telegram-marketplace/internal/app/dependencies"
	"telegram-marketplace/internal/bot/handler"
	botrepo "telegram-marketplace/internal/bot/repository"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	db := database.Connect(ctx, cfg.DatabaseURL)
	defer database.MustClose(db)
	database.Migrate(ctx, db)

	services := dependencies.Wire(ctx, db, cfg)
	botHandler := handler.New(cfg, services, botrepo.New(db))

	if cfg.WebhookURL != "" {
		log.Printf("Starting bot with webhook: %s", cfg.WebhookURL)
		log.Fatal(botHandler.StartWebhook(cfg.Addr, cfg.WebhookURL))
	} else {
		log.Println("Starting bot with long polling")
		log.Fatal(botHandler.StartPolling())
	}
}
