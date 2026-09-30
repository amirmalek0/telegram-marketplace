package payments

import (
	"telegram-marketplace/internal/core/commerce/payments/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Response DTOs ---

// Response represents a payment in API responses.
type Response struct {
	ID                    string     `json:"id"`
	OrderID               string     `json:"order_id"`
	Method                string     `json:"method"`
	Currency              string     `json:"currency"`
	AmountMinor           int64      `json:"amount_minor"`
	CheckoutReference     string     `json:"checkout_reference"`
	ExternalTransactionID *string    `json:"external_transaction_id,omitempty"`
	ProviderTransactionID *string    `json:"provider_transaction_id,omitempty"`
	Status                string     `json:"status"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
	PaidAt                *time.Time `json:"paid_at,omitempty"`
	RefundedAt            *time.Time `json:"refunded_at,omitempty"`
}

// PaginatedResponse is a paginated list of payment responses.
type PaginatedResponse = pagination.Response[Response]

// toResponse converts a model.Payment to a Response.
func toResponse(p *model.Payment) Response {
	return Response{
		ID:                    p.ID,
		OrderID:               p.OrderID,
		Method:                string(p.Method),
		Currency:              p.Currency,
		AmountMinor:           p.AmountMinor,
		CheckoutReference:     p.CheckoutReference,
		ExternalTransactionID: p.ExternalTransactionID,
		ProviderTransactionID: p.ProviderTransactionID,
		Status:                string(p.Status),
		CreatedAt:             p.CreatedAt,
		UpdatedAt:             p.UpdatedAt,
		PaidAt:                p.PaidAt,
		RefundedAt:            p.RefundedAt,
	}
}
