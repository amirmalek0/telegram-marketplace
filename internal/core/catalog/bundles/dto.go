package bundles

import (
	"telegram-marketplace/internal/core/catalog/bundles/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Request DTOs ---

// CreateRequest represents the payload for creating a new bundle.
type CreateRequest struct {
	FileID      *string `json:"file_id"`
	MessageID   *string `json:"message_id"`
	InventoryID *string `json:"inventory_id"`
}

// UpdateRequest represents the payload for updating a bundle.
type UpdateRequest struct {
	FileID      *string `json:"file_id"`
	MessageID   *string `json:"message_id"`
	InventoryID *string `json:"inventory_id"`
}

// --- Response DTOs ---

// PaginatedResponse is a paginated list of bundle responses.
type PaginatedResponse = pagination.Response[Response]

// Response represents a bundle in API responses.
type Response struct {
	ID          string    `json:"id"`
	FileID      *string   `json:"file_id,omitempty"`
	MessageID   *string   `json:"message_id,omitempty"`
	InventoryID *string   `json:"inventory_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// toResponse converts a model.Bundle to a Response.
func toResponse(b *model.Bundle) Response {
	return Response{
		ID:          b.ID,
		FileID:      b.FileID,
		MessageID:   b.MessageID,
		InventoryID: b.InventoryID,
		CreatedAt:   b.CreatedAt,
	}
}
