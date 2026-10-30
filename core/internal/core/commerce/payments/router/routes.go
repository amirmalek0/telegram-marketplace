package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/payments"
)

func RegisterRoutes(rg *gin.RouterGroup, h *payments.Handler) {
	tma := rg.Group("/payment", middleware.RequireTelegram())
	{
		tma.GET("/methods", h.PaymentMethods)
		tma.POST("/stars/invoice", h.CreateStarsInvoice)
		tma.POST("/stars/test/simulate", h.SimulateStarsPayment)
		tma.POST("/product/checkout", h.CreateProductCheckout)
		tma.POST("/vip/checkout", h.CreateVIPCheckout)
		tma.POST("/vip/quote", h.GetVIPQuote)
		tma.POST("/wallet/topup", h.CreateWalletTopup)
		tma.GET("/wallet", h.GetWallet)
		tma.GET("/wallet/packs", h.ListWalletTopupPacks)
		tma.GET("/deliveries", h.ListDeliveries)
		tma.GET("/manual/price", h.ManualPrice)
		tma.POST("/manual/checkout", h.CreateManualCheckout)
		tma.GET("/manual/checkouts", h.ListManualCheckouts)
		tma.GET("/manual/checkouts/:id", h.GetManualCheckout)
		tma.POST("/manual/checkouts/:id/proof", h.SubmitManualProof)
		tma.POST("/manual/checkouts/:id/cancel", h.CancelManualPayment)
		tma.GET("/manual/checkouts/:id/receipt", h.ManualReceipt)
	}

	admin := rg.Group("/payment", middleware.RequireAdmin())
	{
		admin.GET("/methods/config", h.PaymentMethods)
		admin.PUT("/methods", h.AdminSavePaymentMethods)
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
		admin.GET("/manual/config", h.AdminManualConfig)
		admin.PUT("/manual/config", h.AdminSaveManualConfig)
		admin.POST("/manual/bank", h.AdminDetectBank)
		admin.GET("/manual/prices", h.AdminManualPrices)
		admin.PUT("/manual/prices/:purpose/:target_id", h.AdminSetManualPrice)
		admin.GET("/manual/reviews", h.ListManualCheckouts)
		admin.GET("/manual/reviews/:id", h.GetManualCheckout)
		admin.POST("/manual/reviews/:id", h.AdminReviewManualPayment)
		admin.GET("/manual/reviews/:id/receipt", h.ManualReceipt)
	}
}
