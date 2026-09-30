package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/payments"
)

// RegisterRoutes mounts the payment administration skeleton. Checkout
// routes are intentionally absent until a processor integration is complete.
func RegisterRoutes(rg *gin.RouterGroup, h *payments.Handler) {
	admin := rg.Group("/payment", middleware.RequireAdmin())
	{
		admin.GET("/all", h.AdminList)
	}
}
