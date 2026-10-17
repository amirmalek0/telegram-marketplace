package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/broadcasts"
)

func RegisterRoutes(rg *gin.RouterGroup, h *broadcasts.Handler) {
	admin := rg.Group("/broadcast", middleware.RequireAdmin())
	admin.GET("", h.List)
	admin.POST("", h.Publish)
	admin.DELETE("/:id", h.Archive)
	user := rg.Group("/notification", middleware.RequireTelegram())
	user.GET("", h.Inbox)
	user.GET("/unread-count", h.Unread)
	user.POST("/read-all", h.MarkAllRead)
	user.POST("/:id/read", h.MarkRead)
}
