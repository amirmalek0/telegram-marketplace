package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/referrals"
)

func RegisterRoutes(rg *gin.RouterGroup, h *referrals.Handler) {
	rg.GET("/referral/me", middleware.RequireTelegram(), h.Summary)
	rg.GET("/settings/referrals", middleware.RequireAdmin(), h.Settings)
	rg.PUT("/settings/referrals", middleware.RequireAdmin(), h.UpdateSettings)
}
