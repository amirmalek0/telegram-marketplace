package files

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	bundlesrepo "telegram-marketplace/internal/core/catalog/bundles/repository"
	"telegram-marketplace/internal/core/catalog/files/model"
	"telegram-marketplace/internal/core/catalog/files/repository"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"
	"time"
)

// ErrReferencedByBundle is returned when a file is referenced by a bundle and cannot be deleted.
var ErrReferencedByBundle = errors.New("file is referenced by a bundle and cannot be deleted")

// Service holds the business logic for the files domain.
type Service struct {
	repo        repository.Repository
	storage     storage.Storage
	bundlesRepo bundlesrepo.Repository
}

// NewService constructs a Service with the given Repository and Storage.
func NewService(repo repository.Repository, store storage.Storage, bundlesRepo bundlesrepo.Repository) *Service {
	return &Service{repo: repo, storage: store, bundlesRepo: bundlesRepo}
}

// Upload stores a new file in object storage and saves its metadata.
func (s *Service) Upload(ctx context.Context, fh *multipart.FileHeader) (*model.File, error) {
	storageID, err := storage.UploadFile(ctx, s.storage, fh)
	if err != nil {
		return nil, fmt.Errorf("files.service.Upload: %w", err)
	}

	file := &model.File{
		Name:      fh.Filename,
		Size:      fh.Size,
		MimeType:  fh.Header.Get("Content-Type"),
		StorageID: storageID,
		CreatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, file); err != nil {
		_ = storage.DeleteFile(ctx, s.storage, storageID)
		return nil, fmt.Errorf("files.service.Upload: %w", err)
	}

	return file, nil
}

// GetByID returns a file by its internal UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.File, error) {
	file, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("files.service.GetByID: %w", err)
	}
	return file, nil
}

// List returns a paginated list of files ordered by creation date.
func (s *Service) List(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	files, err := s.repo.List(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("files.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("files.service.List count: %w", err)
	}

	data := make([]Response, 0, len(files))
	for _, f := range files {
		resp, err := s.toResponse(ctx, f)
		if err != nil {
			return nil, fmt.Errorf("files.service.List: %w", err)
		}
		data = append(data, resp)
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// Delete removes a file from storage and the database.
func (s *Service) Delete(ctx context.Context, id string) error {
	// Check if file is referenced by any bundle
	referenced, err := s.bundlesRepo.IsFileReferenced(ctx, id)
	if err != nil {
		return fmt.Errorf("files.service.Delete: %w", err)
	}
	if referenced {
		return ErrReferencedByBundle
	}

	file, err := s.repo.GetByID(ctx, id)
	if err == nil {
		_ = storage.DeleteFile(ctx, s.storage, file.StorageID)
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("files.service.Delete: %w", err)
	}
	return nil
}
