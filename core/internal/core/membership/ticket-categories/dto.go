package ticketcategories

import (
	"telegram-marketplace/internal/core/membership/ticket-categories/model"
	"time"

	"telegram-marketplace/pkg/pagination"
)

// --- Request DTOs ---

// CreateCategoryRequest represents the payload for creating a new ticket category.
type CreateCategoryRequest struct {
	Name string `json:"name" binding:"required,min=2,max=50"`
}

// UpdateCategoryRequest represents the payload for updating a ticket category.
type UpdateCategoryRequest struct {
	Name *string `json:"name" binding:"omitempty,min=2,max=50"`
}

// --- Response DTOs ---

// CategoryResponse represents a ticket category in API responses.
type CategoryResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// PaginatedCategoryResponse is the paginated envelope for the category list endpoint.
type PaginatedCategoryResponse = pagination.Response[CategoryResponse]

// --- Transformation functions ---

// toCategoryResponse converts a model.TicketCategory to CategoryResponse.
func toCategoryResponse(c *model.TicketCategory) CategoryResponse {
	return CategoryResponse{
		ID:        c.ID,
		Name:      c.Name,
		CreatedAt: c.CreatedAt,
	}
}
