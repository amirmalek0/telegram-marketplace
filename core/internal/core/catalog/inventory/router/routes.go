package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/catalog/inventory"
)

// RegisterRoutes mounts all inventory endpoints onto the provided RouterGroup.
// Read operations are accessible to both admins and telegram users.
// Write operations (create, update, delete, bulk add items, delete item) are admin-only.
func RegisterRoutes(rg *gin.RouterGroup, h *inventory.Handler) {
	g := rg.Group("/inventory")

	// Accessible by both admins and telegram users
	public := g.Group("", middleware.RequireAny())
	{
		public.GET("", h.List)
		public.GET("/:id", h.GetByID)
		public.GET("/:id/item", h.ListItems)
	}

	// Admin-only operations
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.POST("", h.Create)
		admin.PATCH("/:id", h.Update)
		admin.DELETE("/:id", h.Delete)
		admin.POST("/:id/item", h.BulkAddItems)
		admin.DELETE("/:id/item/:itemId", h.DeleteItem)
	}
}
