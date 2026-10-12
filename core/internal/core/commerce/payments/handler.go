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
	result, err := h.service.CreateStarsInvoice(c.Request.Context(), telegramID, req.ProductID)
	if err != nil {
		switch {
		case errors.Is(err, ErrOutOfStock):
			c.JSON(http.StatusConflict, gin.H{"error": "موجودی این محصول تمام شده است"})
		case errors.Is(err, ErrCheckoutUnavailable), errors.Is(err, ErrInvalidCheckout):
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "این محصول در حال حاضر قابل خرید نیست"})
		default:
			c.JSON(http.StatusBadGateway, gin.H{"error": "ایجاد فاکتور تلگرام ناموفق بود"})
		}
		return
	}
	c.JSON(http.StatusCreated, result)
}

// ListDeliveries returns the authenticated user's paid digital deliveries.
func (h *Handler) ListDeliveries(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	result, err := h.service.ListDeliveries(c.Request.Context(), telegramID)
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
