package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"telegram-marketplace/internal/core/catalog/categories"
	categoryrouter "telegram-marketplace/internal/core/catalog/categories/router"
	"telegram-marketplace/internal/core/membership/users"
	userrouter "telegram-marketplace/internal/core/membership/users/router"
)

// Handlers groups all domain handlers that the router needs.
// Add a new field here when a new module is introduced.
type Handlers struct {
	Users      *users.Handler
	Categories *categories.Handler
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
	}

	return r
}
