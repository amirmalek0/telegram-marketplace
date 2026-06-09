package config

import (
	"log"
	"os"
)

// Config holds all application-level configuration.
type Config struct {
	DatabaseURL string
	BotToken    string
	Addr        string
}

// Load reads configuration from environment variables and returns a Config.
func Load() Config {
	return Config{
		DatabaseURL: mustEnv("DATABASE_URL"),
		BotToken:    mustEnv("BOT_TOKEN"),
		Addr:        getEnv("ADDR", ":8080"),
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required environment variable %q is not set", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
