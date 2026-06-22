package dependencies

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/app/config"
	"telegram-marketplace/internal/app/router"
	"telegram-marketplace/internal/core/catalog/apis"
	apirepo "telegram-marketplace/internal/core/catalog/apis/repository"
	"telegram-marketplace/internal/core/catalog/bundles"
	bundlerepo "telegram-marketplace/internal/core/catalog/bundles/repository"
	"telegram-marketplace/internal/core/catalog/categories"
	categoryrepo "telegram-marketplace/internal/core/catalog/categories/repository"
	"telegram-marketplace/internal/core/catalog/files"
	filerepo "telegram-marketplace/internal/core/catalog/files/repository"
	"telegram-marketplace/internal/core/catalog/inventory"
	invrepo "telegram-marketplace/internal/core/catalog/inventory/repository"
	"telegram-marketplace/internal/core/catalog/messages"
	msgrepo "telegram-marketplace/internal/core/catalog/messages/repository"
	"telegram-marketplace/internal/core/catalog/products"
	productrepo "telegram-marketplace/internal/core/catalog/products/repository"
	"telegram-marketplace/internal/core/membership/admins"
	adminrepo "telegram-marketplace/internal/core/membership/admins/repository"
	"telegram-marketplace/internal/core/membership/auth"
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
	// --- membership/admins ---
	adminRepo := adminrepo.NewPostgresRepository(db)
	adminService := admins.NewService(adminRepo)
	adminHandler := admins.NewHandler(adminService)

	// --- membership/auth ---
	authService := auth.NewService(adminRepo, cfg.JWTSecret)
	authHandler := auth.NewHandler(authService)

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
	productFilesStore := storageClient.Bucket(cfg.ProductFilesBucket, cfg.ProductFilesPublicURL)

	// --- membership/users ---
	userRepo := userrepo.NewPostgresRepository(db)
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)

	// --- catalog/categories ---
	categoryRepo := categoryrepo.NewPostgresRepository(db)
	categoryService := categories.NewService(categoryRepo, categoryIconsStore)
	categoryHandler := categories.NewHandler(categoryService)

	// --- catalog/bundles (repo created early, needed by files/messages/inventory) ---
	bundleRepo := bundlerepo.NewPostgresRepository(db)

	// --- catalog/files ---
	fileRepo := filerepo.NewPostgresRepository(db)
	fileService := files.NewService(fileRepo, productFilesStore, bundleRepo)
	fileHandler := files.NewHandler(fileService)

	// --- catalog/messages ---
	msgRepo := msgrepo.NewPostgresRepository(db)
	msgService := messages.NewService(msgRepo, bundleRepo)
	msgHandler := messages.NewHandler(msgService)

	// --- catalog/inventory ---
	invRepo := invrepo.NewPostgresRepository(db)
	invService := inventory.NewService(invRepo, bundleRepo)
	invHandler := inventory.NewHandler(invService)

	// --- catalog/apis ---
	apiRepo := apirepo.NewPostgresRepository(db)
	apiService := apis.NewService(apiRepo)
	apiHandler := apis.NewHandler(apiService)

	// --- catalog/bundles ---
	bundleService := bundles.NewService(bundleRepo, fileRepo, msgRepo, invRepo)
	bundleHandler := bundles.NewHandler(bundleService)

	// --- catalog/products ---
	productRepo := productrepo.NewPostgresRepository(db)
	productService := products.NewService(
		productRepo,
		fileRepo,
		msgRepo,
		invRepo,
		bundleRepo,
		apiRepo,
	)
	productHandler := products.NewHandler(productService)

	return router.Handlers{
		Auth:        authHandler,
		AuthService: authService,
		Users:       userHandler,
		Categories:  categoryHandler,
		Files:       fileHandler,
		Messages:    msgHandler,
		Inventory:   invHandler,
		APIs:        apiHandler,
		Bundles:     bundleHandler,
		Products:    productHandler,
		Admins:      adminHandler,
	}
}
