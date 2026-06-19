package inventory

import (
	"context"
	"errors"
	"fmt"
	bundlesrepo "telegram-marketplace/internal/core/catalog/bundles/repository"
	"telegram-marketplace/internal/core/catalog/inventory/model"
	"telegram-marketplace/internal/core/catalog/inventory/repository"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// ErrReferencedByBundle is returned when an inventory is referenced by a bundle and cannot be deleted.
var ErrReferencedByBundle = errors.New("inventory is referenced by a bundle and cannot be deleted")

// Service holds the business logic for the inventory domain.
type Service struct {
	repo        repository.Repository
	bundlesRepo bundlesrepo.Repository
}

// NewService constructs a Service with the given Repository.
func NewService(repo repository.Repository, bundlesRepo bundlesrepo.Repository) *Service {
	return &Service{repo: repo, bundlesRepo: bundlesRepo}
}

// Create stores a new inventory.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*model.Inventory, error) {
	inv := &model.Inventory{
		Name:      req.Name,
		CreatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, inv); err != nil {
		return nil, fmt.Errorf("inventory.service.Create: %w", err)
	}

	return inv, nil
}

// GetByID returns an inventory by its internal UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Inventory, error) {
	inv, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("inventory.service.GetByID: %w", err)
	}
	return inv, nil
}

// List returns a paginated list of inventories ordered by creation date.
func (s *Service) List(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	invs, err := s.repo.List(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("inventory.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("inventory.service.List count: %w", err)
	}

	data := make([]Response, 0, len(invs))
	for _, inv := range invs {
		data = append(data, toResponse(inv))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// Update modifies the name of an existing inventory.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*model.Inventory, error) {
	inv, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("inventory.service.Update: %w", err)
	}

	if req.Name != nil {
		inv.Name = *req.Name
	}

	if err := s.repo.Update(ctx, inv); err != nil {
		return nil, fmt.Errorf("inventory.service.Update: %w", err)
	}

	return inv, nil
}

// Delete removes an inventory from the database.
func (s *Service) Delete(ctx context.Context, id string) error {
	// Check if inventory is referenced by any bundle
	referenced, err := s.bundlesRepo.IsInventoryReferenced(ctx, id)
	if err != nil {
		return fmt.Errorf("inventory.service.Delete: %w", err)
	}
	if referenced {
		return ErrReferencedByBundle
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("inventory.service.Delete: %w", err)
	}
	return nil
}

// BulkAddItems inserts multiple items into an inventory.
func (s *Service) BulkAddItems(ctx context.Context, inventoryID string, req BulkAddItemsRequest) error {
	if err := s.repo.BulkAddItems(ctx, inventoryID, req.Values); err != nil {
		return fmt.Errorf("inventory.service.BulkAddItems: %w", err)
	}
	return nil
}

// ListItems retrieves all items for a given inventory.
func (s *Service) ListItems(ctx context.Context, inventoryID string) ([]ItemResponse, error) {
	items, err := s.repo.ListItems(ctx, inventoryID)
	if err != nil {
		return nil, fmt.Errorf("inventory.service.ListItems: %w", err)
	}

	result := make([]ItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, toItemResponse(item))
	}

	return result, nil
}

// CountAvailableItems returns the number of available items in an inventory.
func (s *Service) CountAvailableItems(ctx context.Context, inventoryID string) (int64, error) {
	count, err := s.repo.CountAvailableItems(ctx, inventoryID)
	if err != nil {
		return 0, fmt.Errorf("inventory.service.CountAvailableItems: %w", err)
	}
	return count, nil
}

// AllocateNextItem atomically reserves the next available item for an order.
func (s *Service) AllocateNextItem(ctx context.Context, inventoryID, orderID, userID string) (*model.InventoryItem, error) {
	item, err := s.repo.AllocateNextItem(ctx, inventoryID, orderID, userID)
	if err != nil {
		return nil, fmt.Errorf("inventory.service.AllocateNextItem: %w", err)
	}
	return item, nil
}

// DeleteItem removes an inventory item by ID.
func (s *Service) DeleteItem(ctx context.Context, itemID string) error {
	if err := s.repo.DeleteItem(ctx, itemID); err != nil {
		return fmt.Errorf("inventory.service.DeleteItem: %w", err)
	}
	return nil
}
