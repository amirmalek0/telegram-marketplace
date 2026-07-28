package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/payments"
)

// RegisterRoutes mounts all payment endpoints onto the provided RouterGroup.
// Telegram users can create payments and view their own payments.
// Gateway callbacks are public (no auth required).
// Admin-only operations include viewing all payments and processing refunds.
func RegisterRoutes(rg *gin.RouterGroup, h *payments.Handler) {
	g := rg.Group("/payment")

	// Public - gateway callbacks (no auth required)
	g.POST("/verify/:provider", h.VerifyPayment)

	// Telegram users only - create and view payments
	tma := g.Group("", middleware.RequireTelegram())
	{
		tma.POST("/create", h.CreatePayment)
		tma.GET("/:id", h.GetByID)
		tma.GET("/gateways", h.ListGateways)
	}

	// Admin only - manage all payments
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.GET("/all", h.AdminList)
		admin.POST("/:id/refund", h.AdminRefund)
	}
}
