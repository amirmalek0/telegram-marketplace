package provider

import (
	"context"
	"telegram-marketplace/internal/core/commerce/payments/model"
)


// Provider defines the interface that all payment gateways must implement.
// This interface enables easy additions of new payment providers.
type Provider interface {
	CreatePayment(ctx context.Context, amount float64, orderID string, description string, callbackURL string) (*model.PaymentResult, error)
	VerifyPayment(ctx context.Context, paymentID string, callbackData map[string]string) (*model.VerificationResult, error)
	Refund(ctx context.Context, paymentID string, amount float64) (*model.RefundResult, error)
	GetGatewayName() string
}
