package config

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all application-level configuration.
type Config struct {
	DatabaseURL        string
	BotToken           string
	Addr               string
	WebhookURL         string // Optional: webhook URL for bot (empty = polling mode)
	WebhookSecret      string // Required in webhook mode; verified on incoming Telegram updates.
	JWTSecret          string // Secret key for signing admin JWT tokens
	CORSAllowedOrigins []string

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
	CategoryIconsPublicURL string // e.g. "/storage/categories-icons"

	ProductFilesBucket    string // e.g. "product-files"
	ProductFilesPublicURL string // e.g. "/storage/product-files"

	ProductImagesBucket     string // e.g. "product-images"
	ProductImagesPublicURL  string // e.g. "/storage/product-images"
	UserProfilePhotosBucket string // Private: served only by authenticated API endpoints.
}

// Load reads configuration from environment variables and returns a Config.
// It automatically loads a .env file if present, searching from the current
// directory up to the project root.
func Load() Config {
	loadEnvFile()

	return Config{
		DatabaseURL:   mustEnv("DATABASE_URL"),
		BotToken:      mustEnv("BOT_TOKEN"),
		Addr:          getEnv("ADDR", ":8080"),
		WebhookURL:    getEnv("WEBHOOK_URL", ""),
		WebhookSecret: getEnv("TELEGRAM_WEBHOOK_SECRET", ""),
		JWTSecret:     mustEnv("JWT_SECRET"),
		CORSAllowedOrigins: splitCSV(getEnv(
			"CORS_ALLOWED_ORIGINS",
			"http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001",
		)),

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

		ProductImagesBucket:     getEnv("PRODUCT_IMAGES_BUCKET", "product-images"),
		UserProfilePhotosBucket: getEnv("USER_PROFILE_PHOTOS_BUCKET", "user-profile-photos"),
		ProductImagesPublicURL:  mustEnv("PRODUCT_IMAGES_PUBLIC_URL"),
	}
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
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
