package router

import (
	"github.com/gin-gonic/gin"

	"telegram-marketplace/internal/core/membership/auth"
)

// RegisterRoutes mounts authentication endpoints on the given router group.
// These routes are public and do not require authentication.
func RegisterRoutes(rg *gin.RouterGroup, h *auth.Handler) {
	g := rg.Group("/auth")
	{
		g.POST("/login", h.Login)
		g.POST("/refresh", h.Refresh)
		g.POST("/logout", h.Logout)
	}
}
