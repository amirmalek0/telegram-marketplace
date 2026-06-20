package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

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
	"telegram-marketplace/internal/core/membership/users"
	userrouter "telegram-marketplace/internal/core/membership/users/router"
)

// Handlers groups all domain handlers that the router needs.
// Add a new field here when a new module is introduced.
type Handlers struct {
	Users      *users.Handler
	Categories *categories.Handler
	Files      *files.Handler
	Messages   *messages.Handler
	Inventory  *inventory.Handler
	APIs       *apis.Handler
	Bundles    *bundles.Handler
	Products   *products.Handler
}

// New creates and configures the gin.Engine:
//   - attaches global middleware (logger, recovery)
//   - registers the /health probe (no auth)
//   - mounts /api/v1 with Telegram Mini App auth
//   - delegates route registration to each domain handler
func New(botToken string, h Handlers) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Health probe — no authentication required
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API v1 — all routes require a valid Telegram Mini App initData
	v1 := r.Group("/api/v1")
	//v1.Use(middleware.TelegramAuth(botToken))
	{
		userrouter.RegisterRoutes(v1, h.Users)
		categoryrouter.RegisterRoutes(v1, h.Categories)
		filerouter.RegisterRoutes(v1, h.Files)
		msgrouter.RegisterRoutes(v1, h.Messages)
		invrouter.RegisterRoutes(v1, h.Inventory)
		apirouter.RegisterRoutes(v1, h.APIs)
		bundlerouter.RegisterRoutes(v1, h.Bundles)
		productrouter.RegisterRoutes(v1, h.Products)
	}

	return r
}
