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
	"telegram-marketplace/internal/core/commerce/coupons"
	couponsrepo "telegram-marketplace/internal/core/commerce/coupons/repository"
	"telegram-marketplace/internal/core/commerce/orders"
	ordersrepo "telegram-marketplace/internal/core/commerce/orders/repository"
	"telegram-marketplace/internal/core/commerce/payments"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/internal/core/commerce/payments/provider"
	"telegram-marketplace/internal/core/commerce/wallets"
	walletrepo "telegram-marketplace/internal/core/commerce/wallets/repository"
	"telegram-marketplace/internal/core/membership/admins"
	adminrepo "telegram-marketplace/internal/core/membership/admins/repository"
	"telegram-marketplace/internal/core/membership/auth"
	ticketcategories "telegram-marketplace/internal/core/membership/ticket-categories"
	ticketcategoryrepo "telegram-marketplace/internal/core/membership/ticket-categories/repository"
	"telegram-marketplace/internal/core/membership/tickets"
	ticketrepo "telegram-marketplace/internal/core/membership/tickets/repository"
	"telegram-marketplace/internal/core/membership/users"
	userrepo "telegram-marketplace/internal/core/membership/users/repository"
	"telegram-marketplace/internal/core/membership/vip"
	viprepo "telegram-marketplace/internal/core/membership/vip/repository"
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

	// --- commerce/wallets ---
	walletTxRepo := walletrepo.NewPostgresRepository(db)
	walletService := wallets.NewService(walletTxRepo, userRepo, db)
	walletHandler := wallets.NewHandler(walletService)

	// --- commerce/coupons ---
	couponsRepo := couponsrepo.NewPostgresRepository(db)
	couponsService := coupons.NewService(couponsRepo)
	couponsHandler := coupons.NewHandler(couponsService)

	// --- commerce/orders ---
	ordersRepo := ordersrepo.NewPostgresRepository(db)
	ordersService := orders.NewService(ordersRepo, productRepo, couponsRepo, userRepo)
	ordersHandler := orders.NewHandler(ordersService)

	// --- commerce/payments ---
	paymentsRepo := paymentsrepo.NewPostgresRepository(db)
	gatewayRegistry := payments.NewGatewayRegistry()

	// Register payment gateways based on configuration
	if cfg.ZarinpalMerchantID != "" {
		gatewayRegistry.Register(provider.NewZarinpal(cfg.ZarinpalMerchantID, cfg.ZarinpalSandbox, cfg.ZarinpalCallbackURL))
	}

	paymentsService := payments.NewService(paymentsRepo, ordersRepo, gatewayRegistry)
	paymentsHandler := payments.NewHandler(paymentsService, cfg.CallbackURL)

	// --- membership/vip ---
	vipPlanRepo := viprepo.NewPostgresRepository(db)
	vipService := vip.NewService(vipPlanRepo)
	vipHandler := vip.NewHandler(vipService)

	// --- membership/ticket-categories ---
	ticketCategoryRepo := ticketcategoryrepo.NewPostgresRepository(db)
	ticketCategoryService := ticketcategories.NewService(ticketCategoryRepo)
	ticketCategoryHandler := ticketcategories.NewHandler(ticketCategoryService)

	// --- membership/tickets ---
	ticketRepo := ticketrepo.NewPostgresRepository(db)
	ticketService := tickets.NewService(ticketRepo, userService, ticketCategoryRepo)
	ticketHandler := tickets.NewHandler(ticketService)

	return router.Handlers{
		Auth:             authHandler,
		AuthService:      authService,
		Users:            userHandler,
		Categories:       categoryHandler,
		Files:            fileHandler,
		Messages:         msgHandler,
		Inventory:        invHandler,
		APIs:             apiHandler,
		Bundles:          bundleHandler,
		Products:         productHandler,
		Admins:           adminHandler,
		Wallets:          walletHandler,
		Coupons:          couponsHandler,
		Orders:           ordersHandler,
		Payments:         paymentsHandler,
		Tickets:          ticketHandler,
		TicketCategories: ticketCategoryHandler,
		VIP:              vipHandler,
	}
}
