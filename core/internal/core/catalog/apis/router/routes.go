package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/catalog/apis"
)

// RegisterRoutes mounts all API endpoints onto the provided RouterGroup.
// Delivery resources and provider configuration are admin-only.
// Customers use ownership-checked payment delivery endpoints.
// Write operations (create, update, delete) are admin-only.
func RegisterRoutes(rg *gin.RouterGroup, h *apis.Handler) {
	g := rg.Group("/api")

	// Admin-only resource inspection
	read := g.Group("", middleware.RequireAdmin())
	{
		read.GET("", h.List)
		read.GET("/:id", h.GetByID)
	}

	// Admin-only operations
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.POST("", h.Create)
		admin.PATCH("/:id", h.Update)
		admin.DELETE("/:id", h.Delete)
	}
}
