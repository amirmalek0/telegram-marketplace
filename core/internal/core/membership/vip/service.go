package vip

import (
	"context"
	"errors"
	"fmt"
	"time"

	"telegram-marketplace/internal/core/membership/vip/model"
	"telegram-marketplace/internal/core/membership/vip/repository"
	"telegram-marketplace/pkg/pagination"
)

// ErrInvalidStatus is returned when a plan status is not recognized.
var ErrInvalidStatus = errors.New("invalid plan status")

// Service holds the business logic for the vip_plans domain.
type Service struct {
	repo repository.Repository
}

// NewService constructs a Service with the given Repository.
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// Create registers a new VIP plan.
func (s *Service) Create(ctx context.Context, req CreatePlanRequest) (*model.Plan, error) {
	status := model.StatusActive
	if req.Status != "" {
		status = model.PlanStatus(req.Status)
		if !status.IsValid() {
			return nil, ErrInvalidStatus
		}
	}

	plan := &model.Plan{
		Title:      req.Title,
		StarsPrice: req.StarsPrice,
		Duration:   req.Duration,
		Status:     status,
		CreatedAt:  time.Now(),
	}

	if err := s.repo.Create(ctx, plan); err != nil {
		return nil, fmt.Errorf("vip.service.Create: %w", err)
	}

	return plan, nil
}

// GetByID returns a VIP plan by its UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Plan, error) {
	plan, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("vip.service.GetByID: %w", err)
	}
	return plan, nil
}

// List returns a paginated list of VIP plans ordered by created_at.
func (s *Service) List(ctx context.Context, paginationParams pagination.Params) (*PaginatedPlanResponse, error) {
	plans, err := s.repo.List(ctx, paginationParams.PerPage, paginationParams.Offset())
	if err != nil {
		return nil, fmt.Errorf("vip.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("vip.service.List count: %w", err)
	}

	data := make([]PlanResponse, len(plans))
	for i, plan := range plans {
		data[i] = toPlanResponse(plan)
	}

	result := pagination.NewResponse(data, total, paginationParams)
	return &result, nil
}

// Update applies partial changes to an existing VIP plan.
func (s *Service) Update(ctx context.Context, id string, req UpdatePlanRequest) (*model.Plan, error) {
	plan, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("vip.service.Update: %w", err)
	}

	if req.Title != nil {
		plan.Title = *req.Title
	}
	if req.StarsPrice != nil {
		plan.StarsPrice = *req.StarsPrice
	}
	if req.Duration != nil {
		plan.Duration = *req.Duration
	}
	if req.Status != nil {
		status := model.PlanStatus(*req.Status)
		if !status.IsValid() {
			return nil, ErrInvalidStatus
		}
		plan.Status = status
	}

	if err := s.repo.Update(ctx, plan); err != nil {
		return nil, fmt.Errorf("vip.service.Update: %w", err)
	}
	return plan, nil
}

// Delete permanently removes a VIP plan.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return repository.ErrNotFound
		}
		return fmt.Errorf("vip.service.Delete: %w", err)
	}
	return nil
}
