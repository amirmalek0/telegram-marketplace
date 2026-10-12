package orders

import (
	"telegram-marketplace/internal/core/commerce/orders/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Response DTOs ---

// Response represents an order in API responses.
type Response struct {
	ID                string     `json:"id"`
	UserID            string     `json:"user_id"`
	ProductID         string     `json:"product_id"`
	Quantity          int        `json:"quantity"`
	Stars             int64      `json:"stars"`
	ProductTitle      string     `json:"product_title"`
	DeliveryStatus    string     `json:"delivery_status,omitempty"`
	DeliveryItemCount int        `json:"delivery_item_count"`
	Status            string     `json:"status"`
	PaidAt            *time.Time `json:"paid_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// PaginatedResponse is a paginated list of order responses.
type PaginatedResponse = pagination.Response[Response]

// toResponse converts a model.Order to a Response.
func toResponse(o *model.Order) Response {
	return Response{
		ID:                o.ID,
		UserID:            o.UserID,
		ProductID:         o.ProductID,
		Quantity:          o.Quantity,
		Stars:             o.Stars,
		ProductTitle:      o.ProductTitle,
		DeliveryStatus:    o.DeliveryStatus,
		DeliveryItemCount: o.DeliveryItems,
		Status:            string(o.Status),
		PaidAt:            o.PaidAt,
		CreatedAt:         o.CreatedAt,
		UpdatedAt:         o.UpdatedAt,
	}
}
