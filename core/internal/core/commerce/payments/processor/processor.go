// Package processor defines the boundary between the payment domain and an
// external checkout system. Each concrete integration implements this contract
// outside the core model.
package processor

import (
	"context"

	"telegram-marketplace/internal/core/commerce/payments/model"
)

// CheckoutRequest contains the provider-neutral data needed to start payment.
type CheckoutRequest struct {
	PaymentID   string
	OrderID     string
	Currency    string
	AmountMinor int64
	Title       string
	Description string
}

// Checkout is returned after an external checkout has been created.
type Checkout struct {
	URL               string
	ExternalReference string
}

// RefundRequest contains the identifiers needed to refund a settled payment.
type RefundRequest struct {
	PaymentID             string
	ExternalTransactionID string
	AmountMinor           int64
	Currency              string
}

// Processor is implemented once for each enabled payment integration.
// Provider callbacks or bot updates must be validated by the adapter and then
// normalized before they mutate an order or payment in the application layer.
type Processor interface {
	Method() model.PaymentMethod
	CreateCheckout(ctx context.Context, request CheckoutRequest) (*Checkout, error)
	Refund(ctx context.Context, request RefundRequest) error
}
