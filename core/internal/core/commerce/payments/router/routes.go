package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/payments"
)

func RegisterRoutes(rg *gin.RouterGroup, h *payments.Handler) {
	tma := rg.Group("/payment", middleware.RequireTelegram())
	{
		tma.POST("/stars/invoice", h.CreateStarsInvoice)
		tma.POST("/stars/test/simulate", h.SimulateStarsPayment)
		tma.GET("/deliveries", h.ListDeliveries)
	}

	admin := rg.Group("/payment", middleware.RequireAdmin())
	{
		admin.GET("/stars", h.AdminListStars)
		admin.GET("/stars/config", h.AdminGetConfig)
		admin.PATCH("/stars/config", h.AdminUpdateConfig)
	}
}
