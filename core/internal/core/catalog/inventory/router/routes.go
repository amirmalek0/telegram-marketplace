package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/catalog/inventory"
)

// RegisterRoutes mounts all inventory endpoints onto the provided RouterGroup.
// Delivery resources and provider configuration are admin-only.
// Customers use ownership-checked payment delivery endpoints.
// Write operations (create, update, delete, bulk add items, delete item) are admin-only.
func RegisterRoutes(rg *gin.RouterGroup, h *inventory.Handler) {
	g := rg.Group("/inventory")

	// Admin-only resource inspection
	read := g.Group("", middleware.RequireAdmin())
	{
		read.GET("", h.List)
		read.GET("/:id", h.GetByID)
		read.GET("/:id/item", h.ListItems)
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
