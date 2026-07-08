package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/coupons"
)

// RegisterRoutes mounts all coupon endpoints onto the provided RouterGroup.
// Telegram users can validate coupon codes.
// Admin-only operations include CRUD operations on coupons.
func RegisterRoutes(rg *gin.RouterGroup, h *coupons.Handler) {
	g := rg.Group("/coupon")

	// Telegram users only - validate coupon codes
	tma := g.Group("", middleware.RequireTelegram())
	{
		tma.POST("/validate", h.Validate)
	}

	// Admin only - manage coupons
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.POST("", h.Create)
		admin.GET("", h.List)
		admin.GET("/:id", h.GetByID)
		admin.PATCH("/:id", h.Update)
		admin.DELETE("/:id", h.Delete)
	}
}
