package payments

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/pkg/pagination"
)

// Handler exposes the currently available payment administration API.
// User checkout routes will be added once invoice creation is implemented.
type Handler struct {
	service *Service
}

// CreateStarsInvoice starts a Telegram Stars purchase for one product.
func (h *Handler) CreateStarsInvoice(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	var req CreateStarsInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateProductCheckout(c.Request.Context(), telegramID, req.ProductID, "telegram_stars")
	if err != nil {
		h.writeCheckoutError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

// CreateProductCheckout purchases a product with Stars, wallet balance, or VIP access.
func (h *Handler) CreateProductCheckout(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	var req CreateProductCheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateProductCheckout(c.Request.Context(), telegramID, req.ProductID, req.Method)
	if err != nil {
		h.writeCheckoutError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) CreateVIPCheckout(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	var req CreateVIPCheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateVIPCheckout(c.Request.Context(), telegramID, req.PlanID, req.Method)
	if err != nil {
		h.writeCheckoutError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) CreateWalletTopup(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	var req CreateWalletTopupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateWalletTopup(c.Request.Context(), telegramID, req.Stars)
	if err != nil {
		h.writeCheckoutError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) GetWallet(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	result, err := h.service.Wallet(c.Request.Context(), telegramID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت کیف پول ناموفق بود"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) writeCheckoutError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrOutOfStock):
		c.JSON(http.StatusConflict, gin.H{"error": "موجودی این محصول تمام شده است"})
	case errors.Is(err, ErrAlreadyPurchased):
		c.JSON(http.StatusConflict, gin.H{"error": "این محصول فقط یک‌بار قابل خرید است و امکان خرید مجدد آن وجود ندارد"})
	case errors.Is(err, ErrInsufficientBalance):
		c.JSON(http.StatusConflict, gin.H{"error": "موجودی کیف پول کافی نیست"})
	case errors.Is(err, ErrCheckoutUnavailable), errors.Is(err, ErrInvalidCheckout):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "این پرداخت در حال حاضر در دسترس نیست"})
	default:
		c.JSON(http.StatusBadGateway, gin.H{"error": "ایجاد پرداخت ناموفق بود"})
	}
}

// ListDeliveries returns the authenticated user's paid digital deliveries.
func (h *Handler) ListDeliveries(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	var query ListDeliveriesQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "product_id is invalid"})
		return
	}
	result, err := h.service.ListDeliveries(c.Request.Context(), telegramID, query.ProductID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تحویل‌ها ناموفق بود"})
		return
	}
	c.JSON(http.StatusOK, result)
}

// SimulateStarsPayment resolves an application-level test checkout. Production
// payments are rejected by the payment's persisted is_test flag.
func (h *Handler) SimulateStarsPayment(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	var req SimulateStarsPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.SimulateStarsPayment(c.Request.Context(), telegramID, req.PaymentID, req.Outcome)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidCheckout):
			c.JSON(http.StatusConflict, gin.H{"error": "این پرداخت دیگر قابل شبیه‌سازی نیست"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "شبیه‌سازی پرداخت ناموفق بود"})
		}
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminGetConfig returns the checkout mode used for newly created payments.
func (h *Handler) AdminGetConfig(c *gin.Context) {
	result, err := h.service.GetPaymentConfig(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تنظیمات پرداخت ناموفق بود"})
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminUpdateConfig switches new checkouts between test simulation and real
// Telegram Stars payment. Existing payments retain the mode they were created with.
func (h *Handler) AdminUpdateConfig(c *gin.Context) {
	var req UpdatePaymentConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.TestMode == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "test_mode is required"})
		return
	}
	result, err := h.service.UpdatePaymentConfig(c.Request.Context(), *req.TestMode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره تنظیمات پرداخت ناموفق بود"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// AdminListStars returns Telegram Stars payment attempts only.
func (h *Handler) AdminListStars(c *gin.Context) {
	params := pagination.FromQuery(c)

	result, err := h.service.ListStars(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
