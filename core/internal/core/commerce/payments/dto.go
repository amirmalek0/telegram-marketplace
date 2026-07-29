package payments

import (
	"telegram-marketplace/internal/core/commerce/payments/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Request DTOs ---

// CreatePaymentRequest represents the payload for creating a new payment.
type CreatePaymentRequest struct {
	OrderID  string `json:"order_id" binding:"required"`
	Provider string `json:"provider" binding:"required"`
}

// VerifyPaymentRequest represents the callback data for verifying a payment.
type VerifyPaymentRequest struct {
	PaymentID string `json:"payment_id" binding:"required"`
}

// --- Response DTOs ---

// Response represents a payment in API responses.
type Response struct {
	ID           string     `json:"id"`
	OrderID      string     `json:"order_id"`
	Provider     string     `json:"provider"`
	GatewayTrxID *string    `json:"gateway_trx_id,omitempty"`
	Amount       float64    `json:"amount"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// CreatePaymentResponse represents the response after creating a payment.
type CreatePaymentResponse struct {
	PaymentID  string `json:"payment_id"`
	PaymentURL string `json:"payment_url,omitempty"`
	Authority  string `json:"authority,omitempty"`
	Message    string `json:"message,omitempty"`
}

// VerifyPaymentResponse represents the response after verifying a payment.
type VerifyPaymentResponse struct {
	Success      bool    `json:"success"`
	PaymentID    string  `json:"payment_id"`
	Amount       float64 `json:"amount"`
	TrackingCode string  `json:"tracking_code,omitempty"`
	CardNumber   string  `json:"card_number,omitempty"`
	Message      string  `json:"message,omitempty"`
}

// GatewayListResponse represents the list of available gateways.
type GatewayListResponse struct {
	Gateways []string `json:"gateways"`
}

// PaginatedResponse is a paginated list of payment responses.
type PaginatedResponse = pagination.Response[Response]

// toResponse converts a model.Payment to a Response.
func toResponse(p *model.Payment) Response {
	return Response{
		ID:           p.ID,
		OrderID:      p.OrderID,
		Provider:     p.Provider,
		GatewayTrxID: p.GatewayTrxID,
		Amount:       p.Amount,
		Status:       string(p.Status),
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    p.UpdatedAt,
	}
}
