package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/userphotos"
)

func RegisterRoutes(r *gin.RouterGroup, h *userphotos.Handler) {
	r.GET("/user/:id/photos", middleware.RequireAdmin(), h.List)
	r.POST("/user/:id/photos/sync", middleware.RequireAdmin(), h.Sync)
	r.GET("/user/:id/photos/:photoID/content", middleware.RequireAny(), h.Content)
}
