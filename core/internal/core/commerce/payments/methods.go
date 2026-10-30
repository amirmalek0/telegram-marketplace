package payments

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
)

func (s *Service) PaymentMethods(ctx context.Context, productID string) (*paymentsrepo.PaymentMethods, error) {
	if productID != "" {
		if _, err := uuid.Parse(productID); err != nil {
			return nil, ErrInvalidCheckout
		}
	}
	r, ok := s.repo.(paymentsrepo.MethodRepository)
	if !ok {
		return nil, paymentsrepo.ErrCheckoutUnavailable
	}
	return r.PaymentMethods(ctx, productID)
}

func (h *Handler) PaymentMethods(c *gin.Context) {
	value, err := h.service.PaymentMethods(c.Request.Context(), c.Query("product_id"))
	if err != nil {
		h.writeCheckoutError(c, err)
		return
	}
	c.JSON(200, value)
}

func (h *Handler) AdminSavePaymentMethods(c *gin.Context) {
	var input struct {
		Stars    *bool  `json:"telegram_stars" binding:"required"`
		Card     *bool  `json:"card_to_card" binding:"required"`
		Revision *int64 `json:"revision" binding:"required,min=0"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(422, gin.H{"error": "تنظیمات روش پرداخت معتبر نیست"})
		return
	}
	value, err := h.service.SavePaymentMethods(c.Request.Context(), paymentsrepo.PaymentMethods{Stars: *input.Stars, CardToCard: *input.Card, Revision: *input.Revision})
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, value)
}

func (s *Service) SavePaymentMethods(ctx context.Context, value paymentsrepo.PaymentMethods) (*paymentsrepo.PaymentMethods, error) {
	r, ok := s.repo.(paymentsrepo.MethodRepository)
	if !ok {
		return nil, paymentsrepo.ErrCheckoutUnavailable
	}
	return r.SavePaymentMethods(ctx, value)
}
