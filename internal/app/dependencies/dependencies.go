package dependencies

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/app/config"
	"telegram-marketplace/internal/app/router"
	"telegram-marketplace/internal/core/catalog/categories"
	categoryrepo "telegram-marketplace/internal/core/catalog/categories/repository"
	"telegram-marketplace/internal/core/membership/users"
	userrepo "telegram-marketplace/internal/core/membership/users/repository"
	"telegram-marketplace/pkg/storage"
)

// Wire constructs all repositories, services, and handlers and returns
// the populated router.Handlers struct.
//
// Each module is a self-contained block. To add a new module:
//  1. Instantiate its repo, service, and handler here.
//  2. Add the handler field to router.Handlers.
//  3. Mount its routes in internal/app/router/router.go.
func Wire(ctx context.Context, db *pgxpool.Pool, cfg config.Config) router.Handlers {
	// --- Infrastructure: storage client (connection-level factory) ---
	storageClient, err := storage.New(storage.Config{
		Provider:  storage.Provider(cfg.StorageProvider),
		Endpoint:  cfg.StorageEndpoint,
		AccessKey: cfg.StorageAccessKey,
		SecretKey: cfg.StorageSecretKey,
		Region:    cfg.StorageRegion,
	})
	if err != nil {
		log.Fatalf("storage: %v", err)
	}

	// Ensure all required buckets exist (creates them if missing).
	if err := storageClient.EnsureBucket(ctx, cfg.CategoryIconsBucket); err != nil {
		log.Fatalf("storage: %v", err)
	}
	if err := storageClient.EnsureBucket(ctx, cfg.ProductFilesBucket); err != nil {
		log.Fatalf("storage: %v", err)
	}

	// Per-entity bucket-scoped Storage instances.
	categoryIconsStore := storageClient.Bucket(cfg.CategoryIconsBucket, cfg.CategoryIconsPublicURL)
	_ = storageClient.Bucket(cfg.ProductFilesBucket, cfg.ProductFilesPublicURL) // reserved for products module

	// --- membership/users ---
	userRepo := userrepo.NewPostgresRepository(db)
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)

	// --- catalog/categories ---
	categoryRepo := categoryrepo.NewPostgresRepository(db)
	categoryService := categories.NewService(categoryRepo, categoryIconsStore)
	categoryHandler := categories.NewHandler(categoryService)

	return router.Handlers{
		Users:      userHandler,
		Categories: categoryHandler,
	}
}
