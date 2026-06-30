package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/users"
)

// RegisterRoutes mounts all user endpoints onto the provided RouterGroup.
// Telegram users can create their own profile and look up by telegram ID.
// Admin-only operations include listing, viewing, updating, banning, and deleting users.
func RegisterRoutes(rg *gin.RouterGroup, h *users.Handler) {
	g := rg.Group("/user")

	// Telegram users only
	tma := g.Group("", middleware.RequireTelegram())
	{
		tma.POST("", h.Save)
		tma.GET("/t/:id", h.GetByTelegramID)
	}

	// Admin only
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.GET("", h.List)
		admin.GET("/:id", h.GetByID)
		admin.PATCH("/:id", h.Update)
		admin.PATCH("/:id/ban", h.SetBanned)
		admin.DELETE("/:id", h.Delete)
	}
}
