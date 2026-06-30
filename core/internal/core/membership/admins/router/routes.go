package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/admins"
)

// RegisterRoutes mounts admin management routes on the given router group.
// All admin management routes require admin JWT authentication.
func RegisterRoutes(rg *gin.RouterGroup, h *admins.Handler) {
	g := rg.Group("/admin", middleware.RequireAdmin())
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.Get)
		g.PUT("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
	}
}
