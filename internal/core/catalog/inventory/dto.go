package inventory

import (
	"telegram-marketplace/internal/core/catalog/inventory/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Request DTOs ---

// CreateRequest represents the payload for creating a new inventory.
type CreateRequest struct {
	Name string `json:"name" binding:"required"`
}

// UpdateRequest represents the payload for updating an inventory.
type UpdateRequest struct {
	Name *string `json:"name"`
}

// BulkAddItemsRequest represents the payload for adding multiple items.
type BulkAddItemsRequest struct {
	Values []string `json:"values" binding:"required,min=1"`
}

// --- Response DTOs ---

// PaginatedResponse is a paginated list of inventory responses.
type PaginatedResponse = pagination.Response[Response]

// Response represents an inventory in API responses.
type Response struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// ItemResponse represents an inventory item in API responses.
type ItemResponse struct {
	ID          string     `json:"id"`
	InventoryID string     `json:"inventory_id"`
	Value       string     `json:"value"`
	Status      string     `json:"status"`
	SoldAt      *time.Time `json:"sold_at,omitempty"`
	OrderID     *string    `json:"order_id,omitempty"`
	UserID      *string    `json:"user_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// toResponse converts a model.Inventory to a Response.
func toResponse(inv *model.Inventory) Response {
	return Response{
		ID:        inv.ID,
		Name:      inv.Name,
		CreatedAt: inv.CreatedAt,
	}
}

// toItemResponse converts a model.InventoryItem to an ItemResponse.
func toItemResponse(item *model.InventoryItem) ItemResponse {
	return ItemResponse{
		ID:          item.ID,
		InventoryID: item.InventoryID,
		Value:       item.Value,
		Status:      item.Status,
		SoldAt:      item.SoldAt,
		OrderID:     item.OrderID,
		UserID:      item.UserID,
		CreatedAt:   item.CreatedAt,
	}
}
