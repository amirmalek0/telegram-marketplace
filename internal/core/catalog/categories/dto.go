package categories

import (
	"telegram-marketplace/internal/core/catalog/categories/model"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"
	"time"
)

// --- Request DTOs ---

// CreateCategoryRequest is the body for POST /categories (multipart/form-data).
// Slug is auto-generated from Title; SortOrder is managed via the reorder API.
type CreateCategoryRequest struct {
	Title string `form:"title" binding:"required"`
}

// UpdateCategoryRequest is the body for PATCH /categories/:id.
// All fields are optional; only non-nil values are applied.
type UpdateCategoryRequest struct {
	Title     *string `json:"title"`
	Slug      *string `json:"slug"`
	SortOrder *int    `json:"sort_order"`
}

// SetActiveRequest is the body for PATCH /categories/:id/active.
type SetActiveRequest struct {
	Active bool `json:"active"`
}

// ReorderItem represents a single category's new sort position.
type ReorderItem struct {
	ID        string `json:"id"         binding:"required"`
	SortOrder int    `json:"sort_order"`
}

// ReorderRequest is the body for PATCH /categories/reorder.
type ReorderRequest struct {
	Items []ReorderItem `json:"items" binding:"required,min=1"`
}

// --- Response DTOs ---

// PaginatedResponse is the paginated envelope for the category list endpoint.
type PaginatedResponse = pagination.Response[Response]

// Response is the JSON representation of a category returned by the API.
// IconURL is resolved from the stored StorageID at response time via storage.PublicURL.
type Response struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Slug      string    `json:"slug"`
	IconURL   string    `json:"icon_url"`
	Active    bool      `json:"active"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

// toResponse converts a model.Category to a Response, resolving the icon key
// to a full public URL using the provided Storage instance.
func toResponse(cat *model.Category, store storage.Storage) Response {
	return Response{
		ID:        cat.ID,
		Title:     cat.Title,
		Slug:      cat.Slug,
		IconURL:   store.PublicURL(cat.StorageID),
		Active:    cat.Active,
		SortOrder: cat.SortOrder,
		CreatedAt: cat.CreatedAt,
	}
}
