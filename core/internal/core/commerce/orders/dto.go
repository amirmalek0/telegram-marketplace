package orders

import (
	"telegram-marketplace/internal/core/commerce/orders/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Request DTOs ---

// CreateRequest represents the payload for creating a new order.
type CreateRequest struct {
	ProductID string  `json:"product_id" binding:"required"`
	Quantity  int     `json:"quantity" binding:"required,gt=0"`
	CouponID  *string `json:"coupon_id"`
}

// UpdateStatusRequest represents the payload for updating an order status (admin).
type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=pending paid failed refunded cancelled"`
}

// --- Response DTOs ---

// Response represents an order in API responses.
type Response struct {
	ID             string     `json:"id"`
	UserID         string     `json:"user_id"`
	ProductID      string     `json:"product_id"`
	Quantity       int        `json:"quantity"`
	CouponID       *string    `json:"coupon_id,omitempty"`
	Amount         float64    `json:"amount"`
	DiscountAmount float64    `json:"discount_amount"`
	PaymentMethod  *string    `json:"payment_method,omitempty"`
	Status         string     `json:"status"`
	PaidAt         *time.Time `json:"paid_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// PaginatedResponse is a paginated list of order responses.
type PaginatedResponse = pagination.Response[Response]

// toResponse converts a model.Order to a Response.
func toResponse(o *model.Order) Response {
	return Response{
		ID:             o.ID,
		UserID:         o.UserID,
		ProductID:      o.ProductID,
		Quantity:       o.Quantity,
		CouponID:       o.CouponID,
		Amount:         o.Amount,
		DiscountAmount: o.DiscountAmount,
		PaymentMethod:  o.PaymentMethod,
		Status:         string(o.Status),
		PaidAt:         o.PaidAt,
		CreatedAt:      o.CreatedAt,
		UpdatedAt:      o.UpdatedAt,
	}
}
