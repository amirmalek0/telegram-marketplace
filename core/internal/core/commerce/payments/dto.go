package payments

import (
	"telegram-marketplace/internal/core/commerce/payments/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

type CreateStarsInvoiceRequest struct {
	ProductID string `json:"product_id" binding:"required,uuid"`
}

type CreateStarsInvoiceResponse struct {
	OrderID           string `json:"order_id"`
	PaymentID         string `json:"payment_id"`
	InvoiceURL        string `json:"invoice_url"`
	Stars             int64  `json:"stars"`
	SimulationEnabled bool   `json:"simulation_enabled"`
}

type PaymentConfigResponse struct {
	TestMode  bool      `json:"test_mode"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UpdatePaymentConfigRequest struct {
	TestMode *bool `json:"test_mode"`
}

type SimulateStarsPaymentRequest struct {
	PaymentID string `json:"payment_id" binding:"required,uuid"`
	Outcome   string `json:"outcome" binding:"required,oneof=succeeded failed cancelled"`
}

type SimulateStarsPaymentResponse struct {
	OrderID        string `json:"order_id"`
	Status         string `json:"status"`
	DeliveryStatus string `json:"delivery_status,omitempty"`
	DeliveryError  string `json:"delivery_error,omitempty"`
}

type DeliveryItemResponse struct {
	Kind        string `json:"kind"`
	Label       string `json:"label"`
	Content     string `json:"content,omitempty"`
	DownloadURL string `json:"download_url,omitempty"`
	FileName    string `json:"file_name,omitempty"`
	MimeType    string `json:"mime_type,omitempty"`
	Size        int64  `json:"size,omitempty"`
}

type DeliveryResponse struct {
	OrderID      string                 `json:"order_id"`
	ProductID    string                 `json:"product_id"`
	ProductTitle string                 `json:"product_title"`
	Status       string                 `json:"status"`
	Error        *string                `json:"error,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	DeliveredAt  *time.Time             `json:"delivered_at,omitempty"`
	Items        []DeliveryItemResponse `json:"items"`
}

// --- Response DTOs ---

// Response represents a payment in API responses.
type Response struct {
	ID                    string     `json:"id"`
	OrderID               string     `json:"order_id"`
	Stars                 int64      `json:"stars"`
	CheckoutReference     string     `json:"checkout_reference"`
	ExternalTransactionID *string    `json:"external_transaction_id,omitempty"`
	ProviderTransactionID *string    `json:"provider_transaction_id,omitempty"`
	IsTest                bool       `json:"is_test"`
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
		Stars:                 p.AmountMinor,
		CheckoutReference:     p.CheckoutReference,
		ExternalTransactionID: p.ExternalTransactionID,
		ProviderTransactionID: p.ProviderTransactionID,
		IsTest:                p.IsTest,
		Status:                string(p.Status),
		CreatedAt:             p.CreatedAt,
		UpdatedAt:             p.UpdatedAt,
		PaidAt:                p.PaidAt,
		RefundedAt:            p.RefundedAt,
	}
}
