package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/catalog/categories"
)

// RegisterRoutes mounts all category endpoints onto the provided RouterGroup.
// Note: static segments (/reorder, /s/:slug) are registered before /:id so
// that gin's router resolves them correctly without ambiguity.
func RegisterRoutes(rg *gin.RouterGroup, h *categories.Handler) {
	g := rg.Group("/categories")
	{
		g.POST("", h.Create)
		g.GET("", h.List)

		// Static-path routes must come before the wildcard /:id
		g.PATCH("/reorder", h.Reorder)
		g.GET("/s/:slug", h.GetBySlug)

		g.GET("/:id", h.GetByID)
		g.PATCH("/:id", h.Update)
		g.POST("/:id/icon", h.UploadIcon)
		g.DELETE("/:id", h.Delete)
	}
}
