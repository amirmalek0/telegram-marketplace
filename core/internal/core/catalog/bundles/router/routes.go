package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/catalog/bundles"
)

// RegisterRoutes mounts all bundle endpoints onto the provided RouterGroup.
func RegisterRoutes(rg *gin.RouterGroup, h *bundles.Handler) {
	g := rg.Group("/bundles")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.PATCH("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
	}
}
