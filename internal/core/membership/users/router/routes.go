package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/membership/users"
)

// RegisterRoutes mounts all user endpoints onto the provided RouterGroup.
func RegisterRoutes(rg *gin.RouterGroup, h *users.Handler) {
	g := rg.Group("/users")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.GET("/t/:id", h.GetByTelegramID)
		g.PATCH("/:id", h.Update)
		g.PATCH("/:id/ban", h.SetBanned)
		g.DELETE("/:id", h.Delete)
	}
}
