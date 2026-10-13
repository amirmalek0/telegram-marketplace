package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/settings"
)

// RegisterPublicRoutes exposes published text overrides, which are visible to
// every Mini App user.
func RegisterPublicRoutes(rg *gin.RouterGroup, h *settings.Handler) {
	rg.GET("/miniapp-content", h.ListContent)
}

func RegisterAdminRoutes(rg *gin.RouterGroup, h *settings.Handler) {
	admin := rg.Group("/miniapp-content", middleware.RequireAdmin())
	admin.PUT("/:key", h.UpdateContent)
	admin.DELETE("/:key", h.ResetContent)
}
