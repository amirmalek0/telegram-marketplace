package ticketcategories

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/membership/ticket-categories/model"
	"telegram-marketplace/internal/core/membership/ticket-categories/repository"
	"time"

	"telegram-marketplace/pkg/pagination"
)

// Service holds the business logic for the ticket_categories domain.
type Service struct {
	repo repository.Repository
}

// NewService constructs a Service with the given Repository.
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// Create registers a new ticket category.
func (s *Service) Create(ctx context.Context, req CreateCategoryRequest) (*model.TicketCategory, error) {
	cat := &model.TicketCategory{
		Name:      req.Name,
		CreatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, cat); err != nil {
		return nil, fmt.Errorf("ticket_categories.service.Create: %w", err)
	}

	return cat, nil
}

// GetByID returns a ticket category by its internal UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.TicketCategory, error) {
	cat, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("ticket_categories.service.GetByID: %w", err)
	}
	return cat, nil
}

// GetByName returns a ticket category by its name.
func (s *Service) GetByName(ctx context.Context, name string) (*model.TicketCategory, error) {
	cat, err := s.repo.GetByName(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("ticket_categories.service.GetByName: %w", err)
	}
	return cat, nil
}

// List returns a paginated list of ticket categories ordered by sort_order.
func (s *Service) List(ctx context.Context, paginationParams pagination.Params) (*PaginatedCategoryResponse, error) {
	cats, err := s.repo.List(ctx, paginationParams.PerPage, paginationParams.Offset())
	if err != nil {
		return nil, fmt.Errorf("ticket_categories.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("ticket_categories.service.List count: %w", err)
	}

	data := make([]CategoryResponse, len(cats))
	for i, cat := range cats {
		data[i] = toCategoryResponse(cat)
	}

	result := pagination.NewResponse(data, total, paginationParams)
	return &result, nil
}

// Update applies partial changes to an existing ticket category.
func (s *Service) Update(ctx context.Context, id string, req UpdateCategoryRequest) (*model.TicketCategory, error) {
	cat, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("ticket_categories.service.Update: %w", err)
	}

	if req.Name != nil {
		cat.Name = *req.Name
	}

	if err := s.repo.Update(ctx, cat); err != nil {
		return nil, fmt.Errorf("ticket_categories.service.Update: %w", err)
	}
	return cat, nil
}

// Delete permanently removes a ticket category.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("ticket_categories.service.Delete: %w", err)
	}
	return nil
}
