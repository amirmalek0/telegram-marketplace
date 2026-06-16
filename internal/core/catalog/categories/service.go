package categories

import (
	"context"
	"fmt"
	"mime/multipart"
	"regexp"
	"strings"
	"telegram-marketplace/internal/core/catalog/categories/model"
	"telegram-marketplace/internal/core/catalog/categories/repository"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"
	"time"
)

// slugNonAlnum matches any character that is not a letter, digit, or space.
var slugNonAlnum = regexp.MustCompile(`[^\p{L}\p{N}\s-]`)

// slugSpaces matches one or more whitespace characters (used to replace with dash).
var slugSpaces = regexp.MustCompile(`\s+`)

// generateSlug converts a human-readable title into a URL-safe slug.
// Example: "Hello World!" → "hello-world"
func generateSlug(title string) string {
	s := strings.ToLower(title)
	s = slugNonAlnum.ReplaceAllString(s, "")
	s = slugSpaces.ReplaceAllString(strings.TrimSpace(s), "-")
	return s
}

// Service holds the business logic for the categories domain.
type Service struct {
	repo  repository.Repository
	store storage.Storage
}

// NewService constructs a Service with the given Repository and Storage (plain DI).
func NewService(repo repository.Repository, store storage.Storage) *Service {
	return &Service{repo: repo, store: store}
}

// Create registers a new category.
// Slug is auto-generated from Title; SortOrder defaults to 0 and is managed via Reorder.
// Slug uniqueness is enforced by the DB UNIQUE constraint.
// If icon is non-nil it is uploaded to object storage first; the resulting storage ID
// is included in the single INSERT so only one DB round-trip is needed.
func (s *Service) Create(ctx context.Context, req CreateCategoryRequest, icon *multipart.FileHeader) (*model.Category, error) {
	cat := &model.Category{
		Title:     req.Title,
		Slug:      generateSlug(req.Title),
		Active:    true,
		CreatedAt: time.Now(),
	}

	if icon != nil {
		storageID, err := storage.UploadFile(ctx, s.store, icon)
		if err != nil {
			return nil, fmt.Errorf("categories.service.Create: %w", err)
		}
		cat.StorageID = storageID
	}

	if err := s.repo.Create(ctx, cat); err != nil {
		// clean up the uploaded file if the DB insert fails.
		_ = storage.DeleteFile(ctx, s.store, cat.StorageID)
		return nil, fmt.Errorf("categories.service.Create: %w", err)
	}

	return cat, nil
}

// GetByID returns a category by its internal UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Category, error) {
	cat, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("categories.service.GetByID: %w", err)
	}
	return cat, nil
}

// GetBySlug returns a category by its unique slug.
func (s *Service) GetBySlug(ctx context.Context, slug string) (*model.Category, error) {
	cat, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, fmt.Errorf("categories.service.GetBySlug: %w", err)
	}
	return cat, nil
}

// List returns a paginated list of categories ordered by sort_order.
func (s *Service) List(ctx context.Context, paginationParams pagination.Params) (*PaginatedResponse, error) {
	cats, err := s.repo.List(ctx, paginationParams.PerPage, paginationParams.Offset())
	if err != nil {
		return nil, fmt.Errorf("categories.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("categories.service.List count: %w", err)
	}

	data := make([]Response, 0, len(cats))
	for _, cat := range cats {
		resp, err := toResponse(ctx, cat, s.store)
		if err != nil {
			return nil, fmt.Errorf("categories.service.List: %w", err)
		}
		data = append(data, resp)
	}

	result := pagination.NewResponse(data, total, paginationParams)
	return &result, nil
}

// Update applies partial changes to an existing category.
// If Title is provided, Slug is auto-generated from it.
func (s *Service) Update(ctx context.Context, id string, req UpdateCategoryRequest) (*model.Category, error) {
	cat, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("categories.service.Update: %w", err)
	}

	if req.Title != nil {
		cat.Title = *req.Title
		cat.Slug = generateSlug(*req.Title)
	}
	if req.Active != nil {
		cat.Active = *req.Active
	}
	if req.SortOrder != nil {
		cat.SortOrder = *req.SortOrder
	}

	if err := s.repo.Update(ctx, cat); err != nil {
		return nil, fmt.Errorf("categories.service.Update: %w", err)
	}
	return cat, nil
}

// Reorder bulk-updates sort_order for multiple categories in a single DB round-trip.
func (s *Service) Reorder(ctx context.Context, req ReorderRequest) error {
	ids := make([]string, len(req.Items))
	orders := make([]int, len(req.Items))
	for i, item := range req.Items {
		ids[i] = item.ID
		orders[i] = item.SortOrder
	}
	if err := s.repo.BulkUpdateSortOrder(ctx, ids, orders); err != nil {
		return fmt.Errorf("categories.service.Reorder: %w", err)
	}
	return nil
}

// UploadIcon replaces the icon for an existing category.
// A new UUID key is generated for the upload; the previous icon is deleted best-effort.
// Returns the updated category.
func (s *Service) UploadIcon(ctx context.Context, id string, icon *multipart.FileHeader) (*model.Category, error) {
	cat, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("categories.service.UploadIcon: %w", err)
	}

	storageID, err := storage.UploadFile(ctx, s.store, icon)
	if err != nil {
		return nil, fmt.Errorf("categories.service.UploadIcon: %w", err)
	}

	if err := s.repo.UpdateStorageID(ctx, id, storageID); err != nil {
		return nil, fmt.Errorf("categories.service.UploadIcon: %w", err)
	}

	// Best-effort: remove the previous icon after the DB is updated.
	_ = storage.DeleteFile(ctx, s.store, cat.StorageID)

	cat.StorageID = storageID
	return cat, nil
}

// Delete permanently removes a category.
func (s *Service) Delete(ctx context.Context, id string) error {
	// Best-effort: remove icon from storage before deleting the record.
	cat, err := s.repo.GetByID(ctx, id)
	if err == nil {
		_ = storage.DeleteFile(ctx, s.store, cat.StorageID)
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("categories.service.Delete: %w", err)
	}
	return nil
}

// Store returns the underlying Storage so handlers can resolve public URLs.
func (s *Service) Store() storage.Storage {
	return s.store
}
