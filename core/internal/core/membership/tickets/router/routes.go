package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/tickets"
)

// RegisterRoutes mounts all ticket endpoints onto the provided RouterGroup.
// Telegram users can create tickets, view their own tickets, and add messages.
// Admin-only operations include listing all tickets, updating, closing, reopening, and deleting tickets.
func RegisterRoutes(rg *gin.RouterGroup, h *tickets.Handler) {
	g := rg.Group("/ticket")

	// Telegram users only - user ticket operations
	tma := g.Group("", middleware.RequireTelegram())
	{
		tma.POST("", h.Create)
		tma.GET("/:id/messages", h.ListMessages)
	}

	// Any authenticated user (Telegram or Admin) - shared operations
	any := g.Group("", middleware.RequireAny())
	{
		any.POST("/:id/messages", h.AddMessage)
		any.GET("", h.List)
		any.GET("/:id", h.Get)
	}

	// Admin only - admin ticket management operations
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.PATCH("/:id", h.Update)
		admin.DELETE("/:id", h.Delete)
	}
}
