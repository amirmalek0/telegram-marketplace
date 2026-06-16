package categories

import (
	"context"
	"telegram-marketplace/internal/core/catalog/categories/model"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"
	"time"
)

// --- Request DTOs ---

type CreateCategoryRequest struct {
	Title string `form:"title" binding:"required"`
}

type UpdateCategoryRequest struct {
	Title     *string `json:"title"`
	Active    *bool   `json:"active"`
	SortOrder *int    `json:"sort_order"`
}

type ReorderItem struct {
	ID        string `json:"id"         binding:"required"`
	SortOrder int    `json:"sort_order"`
}

type ReorderRequest struct {
	Items []ReorderItem `json:"items" binding:"required,min=1"`
}

// --- Response DTOs ---

type PaginatedResponse = pagination.Response[Response]

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
// to a presigned URL using the Service's storage instance.
func (s *Service) toResponse(ctx context.Context, cat *model.Category) (Response, error) {
	iconURL := ""
	if cat.StorageID != "" {
		var err error
		iconURL, err = s.storage.PresignedURL(ctx, cat.StorageID, storage.PresignedURLTTL)
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
