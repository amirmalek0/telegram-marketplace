package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/botmessages"
)

func RegisterRoutes(rg *gin.RouterGroup, h *botmessages.Handler) {
	admin := rg.Group("/settings/bot-messages", middleware.RequireAdmin())
	admin.GET("", h.List)
	admin.PUT("", h.Save)
}
