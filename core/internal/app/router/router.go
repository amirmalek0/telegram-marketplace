package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/catalog/apis"
	apirouter "telegram-marketplace/internal/core/catalog/apis/router"
	"telegram-marketplace/internal/core/catalog/bundles"
	bundlerouter "telegram-marketplace/internal/core/catalog/bundles/router"
	"telegram-marketplace/internal/core/catalog/categories"
	categoryrouter "telegram-marketplace/internal/core/catalog/categories/router"
	"telegram-marketplace/internal/core/catalog/files"
	filerouter "telegram-marketplace/internal/core/catalog/files/router"
	"telegram-marketplace/internal/core/catalog/inventory"
	invrouter "telegram-marketplace/internal/core/catalog/inventory/router"
	"telegram-marketplace/internal/core/catalog/messages"
	msgrouter "telegram-marketplace/internal/core/catalog/messages/router"
	"telegram-marketplace/internal/core/catalog/products"
	productrouter "telegram-marketplace/internal/core/catalog/products/router"
	"telegram-marketplace/internal/core/membership/admins"
	adminrouter "telegram-marketplace/internal/core/membership/admins/router"
	"telegram-marketplace/internal/core/membership/auth"
	authrouter "telegram-marketplace/internal/core/membership/auth/router"
	"telegram-marketplace/internal/core/membership/users"
	userrouter "telegram-marketplace/internal/core/membership/users/router"
)

// Handlers groups all domain handlers that the router needs.
// Add a new field here when a new module is introduced.
type Handlers struct {
	Auth         *auth.Handler
	Users        *users.Handler
	Categories   *categories.Handler
	Files        *files.Handler
	Messages     *messages.Handler
	Inventory    *inventory.Handler
	APIs         *apis.Handler
	Bundles      *bundles.Handler
	Products     *products.Handler
	Admins       *admins.Handler
	AdminService *admins.Service
}

// New creates and configures the gin.Engine:
//   - attaches global middleware (logger, recovery)
//   - registers the /health probe (no auth)
//   - mounts /api/v1 with clean sub-groups for auth and domain routes
//   - each module's RegisterRoutes applies per-route guards (RequireAdmin, RequireTelegram, RequireAny)
func New(botToken string, h Handlers) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Health probe — no authentication required
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ── /api/v1 ──────────────────────────────────────────
	api := r.Group("/api/v1")
	{
		// Public auth endpoints — no auth required (they issue tokens)
		authrouter.RegisterRoutes(api, h.Auth)

		// Domain routes — OptionalAuth attempts both Telegram (tma) and JWT (Bearer)
		// authentication but never rejects. Per-route guards enforce access control.
		domain := api.Group("")
		domain.Use(middleware.OptionalAuth(botToken, h.AdminService))
		{
			userrouter.RegisterRoutes(domain, h.Users)
			categoryrouter.RegisterRoutes(domain, h.Categories)
			filerouter.RegisterRoutes(domain, h.Files)
			msgrouter.RegisterRoutes(domain, h.Messages)
			invrouter.RegisterRoutes(domain, h.Inventory)
			apirouter.RegisterRoutes(domain, h.APIs)
			bundlerouter.RegisterRoutes(domain, h.Bundles)
			productrouter.RegisterRoutes(domain, h.Products)
			adminrouter.RegisterRoutes(domain, h.Admins)
		}
	}

	return r
}
