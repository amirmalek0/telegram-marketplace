package categories

import (
	"context"
	"telegram-marketplace/internal/core/catalog/categories/model"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"
	"time"
)

// presignedURLTTL is the default expiration time for presigned URLs.
const presignedURLTTL = 12 * time.Hour

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
// to a presigned URL using the provided Storage instance.
func toResponse(ctx context.Context, cat *model.Category, store storage.Storage) (Response, error) {
	iconURL := ""
	if cat.StorageID != "" {
		var err error
		iconURL, err = store.PresignedURL(ctx, cat.StorageID, presignedURLTTL)
		if err != nil {
			return Response{}, err
		}
	}
	return Response{
		ID:        cat.ID,
		Title:     cat.Title,
		Slug:      cat.Slug,
		IconURL:   iconURL,
		Active:    cat.Active,
		SortOrder: cat.SortOrder,
		CreatedAt: cat.CreatedAt,
	}, nil
}
