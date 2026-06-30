package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/catalog/categories"
)

// RegisterRoutes mounts all category endpoints onto the provided RouterGroup.
// Read operations are accessible to both admins and telegram users.
// Write operations (create, reorder, update, upload icon, delete) are admin-only.
// Note: static segments (/reorder) are registered before /:id so
// that gin's router resolves them correctly without ambiguity.
func RegisterRoutes(rg *gin.RouterGroup, h *categories.Handler) {
	g := rg.Group("/category")

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
		admin.PATCH("/reorder", h.Reorder)
		admin.PATCH("/:id", h.Update)
		admin.POST("/:id/icon", h.UploadIcon)
		admin.DELETE("/:id", h.Delete)
	}
}
