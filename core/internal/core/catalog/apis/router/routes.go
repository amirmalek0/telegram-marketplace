package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/catalog/apis"
)

// RegisterRoutes mounts all API endpoints onto the provided RouterGroup.
func RegisterRoutes(rg *gin.RouterGroup, h *apis.Handler) {
	g := rg.Group("/apis")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.PATCH("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
	}
}
