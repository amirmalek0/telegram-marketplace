package dependencies

import (
	"github.com/jackc/pgx/v5/pgxpool"

	"telegram-marketplace/internal/app/router"
	"telegram-marketplace/internal/core/membership/users"
)

// Wire constructs all repositories, services, and handlers and returns
// the populated router.Handlers struct.
//
// Each module is a self-contained block. To add a new module:
//  1. Instantiate its repo, service, and handler here.
//  2. Add the handler field to router.Handlers.
//  3. Mount its routes in internal/app/router/router.go.
func Wire(db *pgxpool.Pool) router.Handlers {
	// membership/users
	userRepo    := users.NewPostgresRepository(db)
	userService := users.NewService(userRepo)
	userHandler := users.NewHandler(userService)

	// catalog/products — uncomment when ready
	// productRepo    := products.NewPostgresRepository(db)
	// productService := products.NewService(productRepo)
	// productHandler := products.NewHandler(productService)

	return router.Handlers{
		Users: userHandler,
		// Products: productHandler,
	}
}
