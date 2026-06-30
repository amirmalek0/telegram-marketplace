package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/catalog/files"
)

// RegisterRoutes mounts all file endpoints onto the provided RouterGroup.
// Read operations are accessible to both admins and telegram users.
// Write operations (upload, delete) are admin-only.
func RegisterRoutes(rg *gin.RouterGroup, h *files.Handler) {
	g := rg.Group("/file")

	// Accessible by both admins and telegram users
	public := g.Group("", middleware.RequireAny())
	{
		public.GET("", h.List)
		public.GET("/:id", h.GetByID)
	}

	// Admin-only operations
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.POST("", h.Upload)
		admin.DELETE("/:id", h.Delete)
	}
}
