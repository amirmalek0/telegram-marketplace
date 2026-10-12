package orders

import (
	"context"
	"errors"
	"fmt"
	"telegram-marketplace/internal/core/commerce/orders/model"
	"telegram-marketplace/internal/core/commerce/orders/repository"
	usersrepo "telegram-marketplace/internal/core/membership/users/repository"
	"telegram-marketplace/pkg/pagination"
)

// ErrUserNotFound is returned when the user does not exist.
var ErrUserNotFound = errors.New("user not found")

// Service holds the business logic for the orders domain.
type Service struct {
	repo     repository.Repository
	userRepo usersrepo.Repository
}

// NewService constructs a Service with the given repositories.
func NewService(repo repository.Repository, userRepo usersrepo.Repository) *Service {
	return &Service{repo: repo, userRepo: userRepo}
}

// getUserIDByTelegramID looks up a user by their Telegram ID and returns their UUID.
func (s *Service) getUserIDByTelegramID(ctx context.Context, telegramID int64) (string, error) {
	user, err := s.userRepo.GetByTelegramID(ctx, telegramID)
	if err != nil {
		if errors.Is(err, usersrepo.ErrNotFound) {
			return "", ErrUserNotFound
		}
		return "", fmt.Errorf("orders.service.getUserIDByTelegramID: %w", err)
	}
	return user.ID, nil
}

// GetByID returns an order by its UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Order, error) {
	order, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("orders.service.GetByID: %w", err)
	}

	return order, nil
}

// GetByIDForTelegramID prevents one shopper from reading another shopper's
// order by guessing its UUID.
func (s *Service) GetByIDForTelegramID(ctx context.Context, id string, telegramID int64) (*model.Order, error) {
	userID, err := s.getUserIDByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, err
	}
	order, err := s.GetByID(ctx, id)
	if err != nil || order.UserID != userID {
		return nil, repository.ErrNotFound
	}
	return order, nil
}

// ListByTelegramID returns a paginated list of orders for a telegram user.
func (s *Service) ListByTelegramID(ctx context.Context, telegramID int64, params pagination.Params) (*PaginatedResponse, error) {
	// Look up user by telegram ID
	userID, err := s.getUserIDByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, err
	}

	orders, err := s.repo.ListByUserID(ctx, userID, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("orders.service.ListByTelegramID: %w", err)
	}

	total, err := s.repo.CountByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("orders.service.ListByTelegramID count: %w", err)
	}

	data := make([]Response, 0, len(orders))
	for _, o := range orders {
		data = append(data, toResponse(o))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// ListAll returns a paginated list of all orders (admin).
func (s *Service) ListAll(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	orders, err := s.repo.ListAll(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("orders.service.ListAll: %w", err)
	}

	total, err := s.repo.CountAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("orders.service.ListAll count: %w", err)
	}

	data := make([]Response, 0, len(orders))
	for _, o := range orders {
		data = append(data, toResponse(o))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}
