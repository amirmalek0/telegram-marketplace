package products

import (
	"telegram-marketplace/internal/core/catalog/products/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Request DTOs ---

// CreateRequest represents the payload for creating a new product.
type CreateRequest struct {
	Title        string  `json:"title" binding:"required"`
	Description  string  `json:"description"`
	Price        float64 `json:"price" binding:"required,gt=0"`
	CategoryID   string  `json:"category_id" binding:"required"`
	DeliveryType string  `json:"delivery_type" binding:"required,oneof=file message inventory bundle api"`
	FileID       *string `json:"file_id"`
	MessageID    *string `json:"message_id"`
	InventoryID  *string `json:"inventory_id"`
	BundleID     *string `json:"bundle_id"`
	APIID        *string `json:"api_id"`
	DemoURL      *string `json:"demo_url"`
	VIPOnly      bool    `json:"vip_only"`
}

// UpdateRequest represents the payload for updating a product.
type UpdateRequest struct {
	Title        *string  `json:"title"`
	Description  *string  `json:"description"`
	Price        *float64 `json:"price" binding:"omitempty,gt=0"`
	CategoryID   *string  `json:"category_id"`
	DeliveryType *string  `json:"delivery_type" binding:"omitempty,oneof=file message inventory bundle api"`
	FileID       *string  `json:"file_id"`
	MessageID    *string  `json:"message_id"`
	InventoryID  *string  `json:"inventory_id"`
	BundleID     *string  `json:"bundle_id"`
	APIID        *string  `json:"api_id"`
	DemoURL      *string  `json:"demo_url"`
	VIPOnly      *bool    `json:"vip_only"`
	Status       *string  `json:"status" binding:"omitempty,oneof=active draft archived"`
}

// --- Response DTOs ---

// PaginatedResponse is a paginated list of product responses.
type PaginatedResponse = pagination.Response[Response]

// Response represents a product in API responses.
type Response struct {
	ID           string             `json:"id"`
	Title        string             `json:"title"`
	Description  string             `json:"description"`
	Price        float64            `json:"price"`
	CategoryID   string             `json:"category_id"`
	DeliveryType model.DeliveryType `json:"delivery_type"`
	FileID       *string            `json:"file_id,omitempty"`
	MessageID    *string            `json:"message_id,omitempty"`
	InventoryID  *string            `json:"inventory_id,omitempty"`
	BundleID     *string            `json:"bundle_id,omitempty"`
	APIID        *string            `json:"api_id,omitempty"`
	DemoURL      *string            `json:"demo_url,omitempty"`
	VIPOnly      bool               `json:"vip_only"`
	ViewsCount   int                `json:"views_count"`
	Status       string             `json:"status"`
	CreatedAt    time.Time          `json:"created_at"`
}

// toResponse converts a model.Product to a Response.
func toResponse(p *model.Product) Response {
	return Response{
		ID:           p.ID,
		Title:        p.Title,
		Description:  p.Description,
		Price:        p.Price,
		CategoryID:   p.CategoryID,
		DeliveryType: p.DeliveryType,
		FileID:       p.FileID,
		MessageID:    p.MessageID,
		InventoryID:  p.InventoryID,
		BundleID:     p.BundleID,
		APIID:        p.APIID,
		DemoURL:      p.DemoURL,
		VIPOnly:      p.VIPOnly,
		ViewsCount:   p.ViewsCount,
		Status:       p.Status,
		CreatedAt:    p.CreatedAt,
	}
}
