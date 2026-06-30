package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/catalog/messages"
)

// RegisterRoutes mounts all message endpoints onto the provided RouterGroup.
// Read operations are accessible to both admins and telegram users.
// Write operations (create, update, delete) are admin-only.
func RegisterRoutes(rg *gin.RouterGroup, h *messages.Handler) {
	g := rg.Group("/message")

	// Accessible by both admins and telegram users
	public := g.Group("", middleware.RequireAny())
	{
		public.GET("", h.List)
		public.GET("/:id", h.GetByID)
	}

	// Admin-only operations
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.POST("", h.Create)
		admin.PATCH("/:id", h.Update)
		admin.DELETE("/:id", h.Delete)
	}
}
