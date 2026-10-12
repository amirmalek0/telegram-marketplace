package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/orders"
)

// RegisterRoutes mounts all order endpoints onto the provided RouterGroup.
// Orders are created only by a payment provider checkout. Telegram users can
// view their own orders, while administrators can view the full ledger.
func RegisterRoutes(rg *gin.RouterGroup, h *orders.Handler) {
	g := rg.Group("/order")

	// Telegram users only - own order operations
	tma := g.Group("", middleware.RequireTelegram())
	{
		tma.GET("", h.List)
		tma.GET("/:id", h.GetByID)
	}

	// Admin only - manage all orders
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.GET("/all", h.AdminList)
	}
}
