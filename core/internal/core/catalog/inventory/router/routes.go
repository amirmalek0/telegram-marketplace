package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/catalog/inventory"
)

// RegisterRoutes mounts all inventory endpoints onto the provided RouterGroup.
func RegisterRoutes(rg *gin.RouterGroup, h *inventory.Handler) {
	g := rg.Group("/inventories")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.PATCH("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
		g.POST("/:id/items", h.BulkAddItems)
		g.GET("/:id/items", h.ListItems)
		g.DELETE("/:id/items/:itemId", h.DeleteItem)
	}
}
