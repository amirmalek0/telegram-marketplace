package coupons

import (
	"context"
	"errors"
	"fmt"
	"telegram-marketplace/internal/core/commerce/coupons/model"
	"telegram-marketplace/internal/core/commerce/coupons/repository"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// Service holds the business logic for the coupons domain.
type Service struct {
	repo repository.Repository
}

// NewService constructs a Service with the given repository.
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// Create stores a new coupon.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*model.Coupon, error) {
	var expiresAt *time.Time
	if req.ExpiresAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			return nil, fmt.Errorf("coupons.service.Create: invalid expires_at format: %w", err)
		}
		expiresAt = &t
	}

	coupon := model.NewCoupon(
		req.Code,
		model.DiscountType(req.DiscountType),
		req.DiscountValue,
		req.UsageLimit,
		expiresAt,
		req.ProductIDs,
	)

	if err := s.repo.Create(ctx, coupon); err != nil {
		return nil, fmt.Errorf("coupons.service.Create: %w", err)
	}

	return coupon, nil
}

// GetByID returns a coupon by its UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Coupon, error) {
	coupon, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("coupons.service.GetByID: %w", err)
	}
	return coupon, nil
}

// GetByCode returns a coupon by its code.
func (s *Service) GetByCode(ctx context.Context, code string) (*model.Coupon, error) {
	coupon, err := s.repo.GetByCode(ctx, code)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("coupons.service.GetByCode: %w", err)
	}
	return coupon, nil
}

// List returns a paginated list of all coupons.
func (s *Service) List(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	coupons, err := s.repo.List(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("coupons.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("coupons.service.List count: %w", err)
	}

	data := make([]Response, 0, len(coupons))
	for _, c := range coupons {
		data = append(data, toResponse(c))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// Update modifies an existing coupon.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*model.Coupon, error) {
	coupon, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("coupons.service.Update: %w", err)
	}

	update := model.CouponUpdate{
		Code:          req.Code,
		DiscountValue: req.DiscountValue,
		UsageLimit:    req.UsageLimit,
		IsActive:      req.IsActive,
		ProductIDs:    req.ProductIDs,
	}

	if req.DiscountType != nil {
		dt := model.DiscountType(*req.DiscountType)
		update.DiscountType = &dt
	}

	if req.ExpiresAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			return nil, fmt.Errorf("coupons.service.Update: invalid expires_at format: %w", err)
		}
		update.ExpiresAt = &t
	}

	coupon.ApplyUpdates(update)

	if err := s.repo.Update(ctx, coupon); err != nil {
		return nil, fmt.Errorf("coupons.service.Update: %w", err)
	}

	return coupon, nil
}

// Delete removes a coupon from the database.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("coupons.service.Delete: %w", err)
	}
	return nil
}

// Validate validates a coupon code and returns the validation result.
func (s *Service) Validate(ctx context.Context, req ValidateRequest) (*ValidateResponse, error) {
	coupon, err := s.repo.GetByCode(ctx, req.Code)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return &ValidateResponse{
				Valid:   false,
				Code:    req.Code,
				Message: "coupon not found",
			}, nil
		}
		return nil, fmt.Errorf("coupons.service.Validate: %w", err)
	}

	if err := coupon.Validate(req.ProductID); err != nil {
		return &ValidateResponse{
			Valid:   false,
			Code:    req.Code,
			Message: err.Error(),
		}, nil
	}

	return &ValidateResponse{
		Valid:         true,
		Code:          coupon.Code,
		DiscountType:  string(coupon.DiscountType),
		DiscountValue: coupon.DiscountValue,
		ProductIDs:    coupon.ProductIDs,
	}, nil
}
