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
	rg.GET("/miniapp-logo/:key", h.Logo)
	rg.GET("/miniapp-images/:key", h.WidgetImage)
}

func RegisterAdminRoutes(rg *gin.RouterGroup, h *settings.Handler) {
	rg.POST("/miniapp-logo", middleware.RequireAdmin(), h.UploadLogo)
	rg.POST("/miniapp-images", middleware.RequireAdmin(), h.UploadWidgetImage)
	rg.GET("/settings/general", middleware.RequireAdmin(), h.General)
	rg.PATCH("/settings/general", middleware.RequireAdmin(), h.UpdateGeneral)
	admin := rg.Group("/miniapp-content", middleware.RequireAdmin())
	admin.PUT("/:key", h.UpdateContent)
	admin.DELETE("/:key", h.ResetContent)
}
