package users

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/membership/users/model"
	"telegram-marketplace/internal/core/membership/users/repository"
	"time"
)

// Service holds the business logic for the users domain.
type Service struct {
	repo repository.Repository
}

// NewService constructs a Service with the given Repository (plain DI).
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// Create registers a new user. Prevents duplicate Telegram IDs.
func (s *Service) Create(ctx context.Context, req CreateUserRequest) (*model.User, error) {
	existing, err := s.repo.GetByTelegramID(ctx, req.TelegramID)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("user with telegram_id %d already exists", req.TelegramID)
	}

	var referredBy *int64
	if req.ReferredBy != 0 {
		referredBy = &req.ReferredBy
	}

	u := &model.User{
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Username:    req.Username,
		TelegramID:  req.TelegramID,
		PhoneNumber: req.PhoneNumber,
		ReferredBy:  referredBy,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.Create(ctx, u); err != nil {
		return nil, fmt.Errorf("users.service.Create: %w", err)
	}
	return u, nil
}

// GetByID returns a user by its internal ID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.User, error) {
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("users.service.GetByID: %w", err)
	}
	return u, nil
}

// GetByTelegramID returns a user by their Telegram ID.
func (s *Service) GetByTelegramID(ctx context.Context, telegramID int64) (*model.User, error) {
	u, err := s.repo.GetByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, fmt.Errorf("users.service.GetByTelegramID: %w", err)
	}
	return u, nil
}

// List returns a paginated list of users.
func (s *Service) List(ctx context.Context, limit, offset int) ([]*model.User, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	users, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("users.service.List: %w", err)
	}
	return users, nil
}

// Update applies profile changes to an existing user.
func (s *Service) Update(ctx context.Context, id string, req UpdateUserRequest) (*model.User, error) {
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("users.service.Update: %w", err)
	}

	if req.FirstName != nil {
		u.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		u.LastName = *req.LastName
	}
	if req.Username != nil {
		u.Username = *req.Username
	}
	if req.PhoneNumber != nil {
		u.PhoneNumber = *req.PhoneNumber
	}

	if err := s.repo.Update(ctx, u); err != nil {
		return nil, fmt.Errorf("users.service.Update: %w", err)
	}
	return u, nil
}

// SetBanned bans or unbans a user.
func (s *Service) SetBanned(ctx context.Context, id string, banned bool) error {
	if err := s.repo.SetBanned(ctx, id, banned); err != nil {
		return fmt.Errorf("users.service.SetBanned: %w", err)
	}
	return nil
}

// Delete permanently removes a user.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("users.service.Delete: %w", err)
	}
	return nil
}
