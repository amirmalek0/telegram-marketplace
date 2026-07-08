package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/orders"
)

// RegisterRoutes mounts all order endpoints onto the provided RouterGroup.
// Telegram users can create orders and view their own orders.
// Admin-only operations include viewing all orders and updating order status.
func RegisterRoutes(rg *gin.RouterGroup, h *orders.Handler) {
	g := rg.Group("/order")

	// Telegram users only - own order operations
	tma := g.Group("", middleware.RequireTelegram())
	{
		tma.POST("", h.Create)
		tma.GET("", h.List)
		tma.GET("/:id", h.GetByID)
	}

	// Admin only - manage all orders
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.GET("/all", h.AdminList)
		admin.PATCH("/:id/status", h.AdminUpdateStatus)
	}
}
