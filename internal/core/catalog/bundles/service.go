package bundles

import (
	"context"
	"errors"
	"fmt"
	"telegram-marketplace/internal/core/catalog/bundles/model"
	"telegram-marketplace/internal/core/catalog/bundles/repository"
	filesrepo "telegram-marketplace/internal/core/catalog/files/repository"
	inventoryrepo "telegram-marketplace/internal/core/catalog/inventory/repository"
	messagesrepo "telegram-marketplace/internal/core/catalog/messages/repository"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// ErrInvalidBundle is returned when a bundle has no IDs set.
var ErrInvalidBundle = errors.New("bundle must have at least one of file_id, message_id, or inventory_id")

// ErrInvalidFileID is returned when the file_id does not exist.
var ErrInvalidFileID = errors.New("selected file is not valid")

// ErrInvalidMessageID is returned when the message_id does not exist.
var ErrInvalidMessageID = errors.New("selected message is not valid")

// ErrInvalidInventoryID is returned when the inventory_id does not exist.
var ErrInvalidInventoryID = errors.New("selected inventory is not valid")

// Service holds the business logic for the bundles domain.
type Service struct {
	repo          repository.Repository
	filesRepo     filesrepo.Repository
	messagesRepo  messagesrepo.Repository
	inventoryRepo inventoryrepo.Repository
}

// NewService constructs a Service with the given repositories.
func NewService(
	repo repository.Repository,
	filesRepo filesrepo.Repository,
	messagesRepo messagesrepo.Repository,
	inventoryRepo inventoryrepo.Repository,
) *Service {
	return &Service{
		repo:          repo,
		filesRepo:     filesRepo,
		messagesRepo:  messagesRepo,
		inventoryRepo: inventoryRepo,
	}
}

// Create stores a new bundle configuration.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*model.Bundle, error) {
	// Validate at least one ID is set
	if req.FileID == nil && req.MessageID == nil && req.InventoryID == nil {
		return nil, ErrInvalidBundle
	}

	// Validate references
	if err := s.validateReferences(ctx, req.FileID, req.MessageID, req.InventoryID); err != nil {
		return nil, err
	}

	bundle := &model.Bundle{
		Name:        req.Name,
		FileID:      req.FileID,
		MessageID:   req.MessageID,
		InventoryID: req.InventoryID,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.Create(ctx, bundle); err != nil {
		return nil, fmt.Errorf("bundles.service.Create: %w", err)
	}

	return bundle, nil
}

// GetByID returns a bundle by its internal UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Bundle, error) {
	bundle, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("bundles.service.GetByID: %w", err)
	}
	return bundle, nil
}

// List returns a paginated list of bundles ordered by creation date.
func (s *Service) List(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	bundles, err := s.repo.List(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("bundles.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("bundles.service.List count: %w", err)
	}

	data := make([]Response, 0, len(bundles))
	for _, b := range bundles {
		data = append(data, toResponse(b))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// Update modifies an existing bundle configuration.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*model.Bundle, error) {
	bundle, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("bundles.service.Update: %w", err)
	}

	if req.Name != nil {
		bundle.Name = *req.Name
	}
	if req.FileID != nil {
		bundle.FileID = req.FileID
	}
	if req.MessageID != nil {
		bundle.MessageID = req.MessageID
	}
	if req.InventoryID != nil {
		bundle.InventoryID = req.InventoryID
	}

	// Validate at least one ID is set after update
	if bundle.FileID == nil && bundle.MessageID == nil && bundle.InventoryID == nil {
		return nil, ErrInvalidBundle
	}

	// Validate references
	if err := s.validateReferences(ctx, bundle.FileID, bundle.MessageID, bundle.InventoryID); err != nil {
		return nil, err
	}

	if err := s.repo.Update(ctx, bundle); err != nil {
		return nil, fmt.Errorf("bundles.service.Update: %w", err)
	}

	return bundle, nil
}

// Delete removes a bundle from the database.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("bundles.service.Delete: %w", err)
	}
	return nil
}

// validateReferences checks if all provided IDs exist in their respective tables.
func (s *Service) validateReferences(ctx context.Context, fileID, messageID, inventoryID *string) error {
	if fileID != nil {
		exists, err := s.filesRepo.Exists(ctx, *fileID)
		if err != nil {
			return fmt.Errorf("bundles.service.validateReferences: %w", err)
		}
		if !exists {
			return ErrInvalidFileID
		}
	}

	if messageID != nil {
		exists, err := s.messagesRepo.Exists(ctx, *messageID)
		if err != nil {
			return fmt.Errorf("bundles.service.validateReferences: %w", err)
		}
		if !exists {
			return ErrInvalidMessageID
		}
	}

	if inventoryID != nil {
		exists, err := s.inventoryRepo.Exists(ctx, *inventoryID)
		if err != nil {
			return fmt.Errorf("bundles.service.validateReferences: %w", err)
		}
		if !exists {
			return ErrInvalidInventoryID
		}
	}

	return nil
}
