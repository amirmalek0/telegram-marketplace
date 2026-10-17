package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/catalog/files"
)

// RegisterRoutes mounts all file endpoints onto the provided RouterGroup.
// Delivery resources and provider configuration are admin-only.
// Customers use ownership-checked payment delivery endpoints.
// Write operations (upload, delete) are admin-only.
func RegisterRoutes(rg *gin.RouterGroup, h *files.Handler) {
	g := rg.Group("/file")

	// Admin-only resource inspection
	read := g.Group("", middleware.RequireAdmin())
	{
		read.GET("", h.List)
		read.GET("/:id", h.GetByID)
	}

	// Admin-only operations
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.POST("", h.Upload)
		admin.DELETE("/:id", h.Delete)
	}
}
