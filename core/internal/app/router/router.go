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
	"telegram-marketplace/internal/core/commerce/coupons"
	couponsrouter "telegram-marketplace/internal/core/commerce/coupons/router"
	"telegram-marketplace/internal/core/commerce/orders"
	ordersrouter "telegram-marketplace/internal/core/commerce/orders/router"
	"telegram-marketplace/internal/core/commerce/payments"
	paymentsrouter "telegram-marketplace/internal/core/commerce/payments/router"
	"telegram-marketplace/internal/core/membership/admins"
	adminrouter "telegram-marketplace/internal/core/membership/admins/router"
	"telegram-marketplace/internal/core/membership/auth"
	authrouter "telegram-marketplace/internal/core/membership/auth/router"
	ticketcategories "telegram-marketplace/internal/core/membership/ticket-categories"
	ticketcategoryrouter "telegram-marketplace/internal/core/membership/ticket-categories/router"
	"telegram-marketplace/internal/core/membership/tickets"
	ticketrouter "telegram-marketplace/internal/core/membership/tickets/router"
	"telegram-marketplace/internal/core/membership/users"
	userrouter "telegram-marketplace/internal/core/membership/users/router"
	"telegram-marketplace/internal/core/membership/vip"
	viprouter "telegram-marketplace/internal/core/membership/vip/router"
	"telegram-marketplace/internal/core/settings"
	settingsrouter "telegram-marketplace/internal/core/settings/router"
)

// Handlers groups all domain handlers that the router needs.
// Add a new field here when a new module is introduced.
type Handlers struct {
	Auth             *auth.Handler
	AuthService      *auth.Service
	Users            *users.Handler
	UsersService     *users.Service
	Categories       *categories.Handler
	Files            *files.Handler
	Messages         *messages.Handler
	Inventory        *inventory.Handler
	APIs             *apis.Handler
	Bundles          *bundles.Handler
	Products         *products.Handler
	Admins           *admins.Handler
	Coupons          *coupons.Handler
	Orders           *orders.Handler
	Payments         *payments.Handler
	PaymentsService  *payments.Service
	Tickets          *tickets.Handler
	TicketCategories *ticketcategories.Handler
	VIP              *vip.Handler
	Settings         *settings.Handler
	SettingsService  *settings.Service
}

// New creates and configures the gin.Engine:
//   - attaches global middleware (logger, recovery, CORS)
//   - registers the /health probe (no auth)
//   - mounts /api/v1 with clean sub-groups for auth and domain routes
//   - each module's RegisterRoutes applies per-route guards (RequireAdmin, RequireTelegram, RequireAny)
func New(botToken string, corsAllowedOrigins []string, h Handlers) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS(corsAllowedOrigins))

	// Health probe — no authentication required
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// ── /api/v1 ──────────────────────────────────────────
	api := r.Group("/api/v1")
	{
		// Public auth endpoints — no auth required (they issue tokens)
		authrouter.RegisterRoutes(api, h.Auth)
		settingsrouter.RegisterPublicRoutes(api, h.Settings)

		// Domain routes — Auth requires valid Telegram (tma) or JWT (Bearer)
		// authentication. Per-route guards enforce role-specific access control.
		authenticated := api.Group("", middleware.Auth(botToken, h.AuthService))
		userrouter.RegisterOnboardingRoutes(authenticated, h.Users)
		domain := authenticated.Group("", middleware.RequireVerifiedPhone(h.SettingsService, h.UsersService))
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
			couponsrouter.RegisterRoutes(domain, h.Coupons)
			ordersrouter.RegisterRoutes(domain, h.Orders)
			paymentsrouter.RegisterRoutes(domain, h.Payments)
			ticketrouter.RegisterRoutes(domain, h.Tickets)
			ticketcategoryrouter.RegisterRoutes(domain, h.TicketCategories)
			viprouter.RegisterRoutes(domain, h.VIP)
			settingsrouter.RegisterAdminRoutes(domain, h.Settings)
		}
	}

	return r
}
