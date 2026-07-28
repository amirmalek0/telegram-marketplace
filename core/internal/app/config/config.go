package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// Config holds all application-level configuration.
type Config struct {
	DatabaseURL string
	BotToken    string
	Addr        string
	WebhookURL  string // Optional: webhook URL for bot (empty = polling mode)
	JWTSecret   string // Secret key for signing admin JWT tokens

	// Seed admin credentials (used only on first boot)
	AdminSeedUsername string // default: "admin"
	AdminSeedPassword string // default: "admin"

	// Object storage — connection
	StorageProvider  string // "s3" or "minio" (default: "minio")
	StorageEndpoint  string // e.g. http://localhost:9000
	StorageAccessKey string
	StorageSecretKey string
	StorageRegion    string

	// Per-entity buckets (name + public base URL)
	CategoryIconsBucket    string // e.g. "categories-icons"
	CategoryIconsPublicURL string // e.g. "http://localhost:9000/categories-icons"

	ProductFilesBucket    string // e.g. "product-files"
	ProductFilesPublicURL string // e.g. "http://localhost:9000/product-files"

	// Payment Gateway Configuration
	CallbackURL string // Base URL for gateway verify callbacks, e.g. http://localhost:8080/api/v1/payment/verify

	ZarinpalMerchantID  string
	ZarinpalSandbox     bool
	ZarinpalCallbackURL string

}

// Load reads configuration from environment variables and returns a Config.
// It automatically loads a .env file if present, searching from the current
// directory up to the project root.
func Load() Config {
	loadEnvFile()

	return Config{
		DatabaseURL: mustEnv("DATABASE_URL"),
		BotToken:    mustEnv("BOT_TOKEN"),
		Addr:        getEnv("ADDR", ":8080"),
		WebhookURL:  getEnv("WEBHOOK_URL", ""),
		JWTSecret:   mustEnv("JWT_SECRET"),

		AdminSeedUsername: getEnv("ADMIN_SEED_USERNAME", "admin"),
		AdminSeedPassword: getEnv("ADMIN_SEED_PASSWORD", "admin"),

		StorageProvider:  getEnv("STORAGE_PROVIDER", "minio"),
		StorageEndpoint:  mustEnv("STORAGE_ENDPOINT"),
		StorageAccessKey: mustEnv("MINIO_ACCESS_KEY"),
		StorageSecretKey: mustEnv("MINIO_SECRET_KEY"),
		StorageRegion:    getEnv("STORAGE_REGION", "us-east-1"),

		CategoryIconsBucket:    getEnv("CATEGORY_ICONS_BUCKET", "categories-icons"),
		CategoryIconsPublicURL: mustEnv("CATEGORY_ICONS_PUBLIC_URL"),

		ProductFilesBucket:    getEnv("PRODUCT_FILES_BUCKET", "product-files"),
		ProductFilesPublicURL: mustEnv("PRODUCT_FILES_PUBLIC_URL"),

		// Payment Gateway Configuration
		CallbackURL: getEnv("CALLBACK_URL", "http://localhost:8080/api/v1/payment/verify"),

		ZarinpalMerchantID:  getEnv("ZARINPAL_MERCHANT_ID", ""),
		ZarinpalSandbox:     getEnv("ZARINPAL_SANDBOX", "true") == "true",
		ZarinpalCallbackURL: getEnv("ZARINPAL_CALLBACK_URL", ""),

	}
}

// loadEnvFile tries to find and load a .env file by walking up from the
// current working directory until it finds one or reaches the filesystem root.
func loadEnvFile() {
	dir, err := os.Getwd()
	if err != nil {
		return
	}
	for {
		envPath := filepath.Join(dir, ".env")
		if _, err := os.Stat(envPath); err == nil {
			_ = godotenv.Load(envPath)
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return // reached filesystem root
		}
		dir = parent
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
