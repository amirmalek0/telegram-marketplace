package payments

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/pkg/pagination"
)

// Handler wires HTTP concerns to the Service layer.
type Handler struct {
	service     *Service
	callbackURL string
}

// NewHandler constructs a Handler with the given Service and payment callback base URL.
func NewHandler(service *Service, callbackURL string) *Handler {
	return &Handler{
		service:     service,
		callbackURL: strings.TrimRight(callbackURL, "/"),
	}
}

// CreatePayment initiates a payment for an order.
func (h *Handler) CreatePayment(c *gin.Context) {
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	callbackURL := h.callbackURL + "/" + req.Provider

	result, err := h.service.CreatePayment(c.Request.Context(), req.OrderID, req.Provider, callbackURL)
	if err != nil {
		if errors.Is(err, ErrOrderNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, ErrOrderAlreadyPaid) || errors.Is(err, ErrGatewayNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// VerifyPayment handles the callback from payment gateways.
func (h *Handler) VerifyPayment(c *gin.Context) {
	_ = c.Param("provider") // Provider is used in the route but we get it from the payment record
	paymentID := c.Query("payment_id")
	if paymentID == "" {
		paymentID = c.PostForm("payment_id")
	}

	if paymentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_id is required"})
		return
	}

	// Collect all callback data
	callbackData := make(map[string]string)
	for key, values := range c.Request.URL.Query() {
		if len(values) > 0 {
			callbackData[key] = values[0]
		}
	}
	for key, values := range c.Request.PostForm {
		if len(values) > 0 {
			callbackData[key] = values[0]
		}
	}

	result, err := h.service.VerifyPayment(c.Request.Context(), paymentID, callbackData)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	// Redirect or return JSON based on provider
	c.JSON(http.StatusOK, result)
}

// GetByID returns a single payment by its UUID.
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")

	payment, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, paymentsrepo.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(payment))
}

// AdminList returns a paginated list of all payments (admin only).
func (h *Handler) AdminList(c *gin.Context) {
	params := pagination.FromQuery(c)

	result, err := h.service.ListAll(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ListGateways returns all available payment gateways.
func (h *Handler) ListGateways(c *gin.Context) {
	gateways := h.service.ListGateways()
	c.JSON(http.StatusOK, GatewayListResponse{Gateways: gateways})
}
