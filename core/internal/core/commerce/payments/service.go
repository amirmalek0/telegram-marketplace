package payments

import (
	"context"
	"errors"
	"fmt"

	"telegram-marketplace/internal/core/commerce/payments/model"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/pkg/pagination"
)

// Service owns provider-neutral payment persistence. Processor-specific
// checkout and update handling can be added on top of this layer.
type Service struct {
	repo paymentsrepo.Repository
}

// NewService constructs the payment service.
func NewService(repo paymentsrepo.Repository) *Service {
	return &Service{repo: repo}
}

// GetByID returns a payment by its UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Payment, error) {
	payment, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, paymentsrepo.ErrNotFound) {
			return nil, paymentsrepo.ErrNotFound
		}
		return nil, fmt.Errorf("payments.service.GetByID: %w", err)
	}
	return payment, nil
}

// ListByOrderID returns all payment attempts for an order.
func (s *Service) ListByOrderID(ctx context.Context, orderID string) ([]*model.Payment, error) {
	payments, err := s.repo.ListByOrderID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("payments.service.ListByOrderID: %w", err)
	}
	return payments, nil
}

// ListAll returns a paginated list of payments for administrators.
func (s *Service) ListAll(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	payments, err := s.repo.ListAll(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("payments.service.ListAll: %w", err)
	}

	total, err := s.repo.CountAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("payments.service.ListAll count: %w", err)
	}

	data := make([]Response, 0, len(payments))
	for _, payment := range payments {
		data = append(data, toResponse(payment))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}
