package main

import (
	"telegram-marketplace/internal/app/boot"
	"telegram-marketplace/internal/app/config"
)

func main() {
	cfg := config.Load()
	boot.Start(cfg)
}
