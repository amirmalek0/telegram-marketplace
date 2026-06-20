package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/catalog/messages"
)

// RegisterRoutes mounts all message endpoints onto the provided RouterGroup.
func RegisterRoutes(rg *gin.RouterGroup, h *messages.Handler) {
	g := rg.Group("/messages")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.PATCH("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
	}
}
