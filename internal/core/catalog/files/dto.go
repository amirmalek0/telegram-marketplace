package files

import (
	"context"
	"telegram-marketplace/internal/core/catalog/files/model"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"
	"time"
)

// --- Response DTOs ---

// PaginatedResponse is a paginated list of file responses.
type PaginatedResponse = pagination.Response[Response]

// Response represents a file in API responses.
type Response struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Size      int64     `json:"size"`
	MimeType  string    `json:"mime_type"`
	URL       string    `json:"url"`
	CreatedAt time.Time `json:"created_at"`
}

// toResponse converts a model.File to a Response, resolving the storage ID
// to a presigned URL using the Service's storage instance.
func (s *Service) toResponse(ctx context.Context, f *model.File) (Response, error) {
	url := ""
	if f.StorageID != "" {
		var err error
		url, err = s.storage.PresignedURL(ctx, f.StorageID, storage.PresignedURLTTL)
		if err != nil {
			return Response{}, err
		}
	}
	return Response{
		ID:        f.ID,
		Name:      f.Name,
		Size:      f.Size,
		MimeType:  f.MimeType,
		URL:       url,
		CreatedAt: f.CreatedAt,
	}, nil
}
