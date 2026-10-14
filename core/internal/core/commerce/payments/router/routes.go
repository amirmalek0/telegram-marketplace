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
		tma.POST("/product/checkout", h.CreateProductCheckout)
		tma.POST("/vip/checkout", h.CreateVIPCheckout)
		tma.POST("/vip/quote", h.GetVIPQuote)
		tma.POST("/wallet/topup", h.CreateWalletTopup)
		tma.GET("/wallet", h.GetWallet)
		tma.GET("/wallet/packs", h.ListWalletTopupPacks)
		tma.GET("/deliveries", h.ListDeliveries)
	}

	admin := rg.Group("/payment", middleware.RequireAdmin())
	{
		admin.GET("/stars", h.AdminListStars)
		admin.GET("/stars/config", h.AdminGetConfig)
		admin.PATCH("/stars/config", h.AdminUpdateConfig)
		admin.GET("/wallets", h.AdminListWallets)
		admin.GET("/wallets/:user_id", h.AdminGetWallet)
		admin.POST("/wallets/:user_id/adjust", h.AdminAdjustWallet)
		admin.GET("/wallet-topup-packs", h.AdminListWalletTopupPacks)
		admin.POST("/wallet-topup-packs", h.AdminCreateWalletTopupPack)
		admin.PATCH("/wallet-topup-packs/:id", h.AdminUpdateWalletTopupPack)
		admin.DELETE("/wallet-topup-packs/:id", h.AdminDeleteWalletTopupPack)
	}
}
