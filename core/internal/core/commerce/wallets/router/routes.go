package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/wallets"
)

// RegisterRoutes mounts all wallet endpoints onto the provided RouterGroup.
// Telegram users can view their own balance and transaction history.
// Admin-only operations include viewing any user's wallet and manual adjustments.
func RegisterRoutes(rg *gin.RouterGroup, h *wallets.Handler) {
	g := rg.Group("/wallet")

	// Telegram users only - own wallet operations
	tma := g.Group("", middleware.RequireTelegram())
	{
		tma.GET("/balance", h.GetBalance)
		tma.GET("/transactions", h.GetTransactions)
	}

	// Admin only - manage any user's wallet
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.GET("/users/:id/balance", h.AdminGetBalance)
		admin.GET("/users/:id/transactions", h.AdminGetTransactions)
		admin.POST("/adjust", h.AdminAdjust)
	}
}
