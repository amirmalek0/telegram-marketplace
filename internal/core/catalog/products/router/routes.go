package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/catalog/products"
)

// RegisterRoutes mounts all product endpoints onto the provided RouterGroup.
func RegisterRoutes(rg *gin.RouterGroup, h *products.Handler) {
	g := rg.Group("/products")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.PATCH("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
	}
}
