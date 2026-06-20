package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/catalog/files"
)

// RegisterRoutes mounts all file endpoints onto the provided RouterGroup.
func RegisterRoutes(rg *gin.RouterGroup, h *files.Handler) {
	g := rg.Group("/files")
	{
		g.POST("", h.Upload)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.DELETE("/:id", h.Delete)
	}
}
