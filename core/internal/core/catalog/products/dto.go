package products

import (
	"context"
	"telegram-marketplace/internal/core/catalog/products/model"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"
	"time"
)

// --- Request DTOs ---

// CreateRequest represents the payload for creating a new product.
type CreateRequest struct {
	Title        string  `json:"title" binding:"required"`
	Description  string  `json:"description"`
	StarsPrice   int64   `json:"stars_price" binding:"required,gt=0"`
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
	Title        *string `json:"title"`
	Description  *string `json:"description"`
	StarsPrice   *int64  `json:"stars_price" binding:"omitempty,gt=0"`
	CategoryID   *string `json:"category_id"`
	DeliveryType *string `json:"delivery_type" binding:"omitempty,oneof=file message inventory bundle api"`
	FileID       *string `json:"file_id"`
	MessageID    *string `json:"message_id"`
	InventoryID  *string `json:"inventory_id"`
	BundleID     *string `json:"bundle_id"`
	APIID        *string `json:"api_id"`
	DemoURL      *string `json:"demo_url"`
	VIPOnly      *bool   `json:"vip_only"`
	Status       *string `json:"status" binding:"omitempty,oneof=active draft archived"`
}

// --- Response DTOs ---

// PaginatedResponse is a paginated list of product responses.
type PaginatedResponse = pagination.Response[Response]

// Response represents a product in API responses.
type Response struct {
	ID           string             `json:"id"`
	Title        string             `json:"title"`
	Description  string             `json:"description"`
	StarsPrice   int64              `json:"stars_price"`
	CategoryID   string             `json:"category_id"`
	ImageURL     string             `json:"image_url"`
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

// toResponse converts a model.Product to a Response and resolves its image key
// to a time-limited URL. Delivery source identifiers are only included for
// authenticated admin callers; shopper responses must never expose them.
func (s *Service) toResponse(ctx context.Context, p *model.Product, includeDeliveryReferences bool) (Response, error) {
	imageURL := ""
	if p.ImageStorageID != "" {
		var err error
		imageURL, err = s.imageStorage.PresignedURL(ctx, p.ImageStorageID, storage.PresignedURLTTL)
		if err != nil {
			return Response{}, err
		}
	}

	response := Response{
		ID:           p.ID,
		Title:        p.Title,
		Description:  p.Description,
		StarsPrice:   p.StarsPrice,
		CategoryID:   p.CategoryID,
		ImageURL:     imageURL,
		DeliveryType: p.DeliveryType,
		DemoURL:      p.DemoURL,
		VIPOnly:      p.VIPOnly,
		ViewsCount:   p.ViewsCount,
		Status:       p.Status,
		CreatedAt:    p.CreatedAt,
	}

	if includeDeliveryReferences {
		response.FileID = p.FileID
		response.MessageID = p.MessageID
		response.InventoryID = p.InventoryID
		response.BundleID = p.BundleID
		response.APIID = p.APIID
	}

	return response, nil
}
