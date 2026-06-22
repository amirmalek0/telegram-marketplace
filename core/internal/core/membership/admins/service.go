package admins

import (
	"context"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"telegram-marketplace/internal/core/membership/admins/model"
	"telegram-marketplace/internal/core/membership/admins/repository"
)

// Service handles admin business logic.
type Service struct {
	repo repository.Repository
}

// NewService creates a new admin service.
func NewService(repo repository.Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// Create creates a new admin with a hashed password.
func (s *Service) Create(ctx context.Context, req CreateRequest) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	admin := &model.Admin{
		ID:           uuid.New().String(),
		Username:     req.Username,
		PasswordHash: string(hash),
		IsActive:     true,
	}
	return s.repo.Create(ctx, admin)
}

// GetByID retrieves an admin by ID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Admin, error) {
	return s.repo.FindByID(ctx, id)
}

// List retrieves a paginated list of admins.
func (s *Service) List(ctx context.Context, limit, offset int) ([]model.Admin, error) {
	return s.repo.List(ctx, limit, offset)
}

// Update updates an admin's fields.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) error {
	updates := make(map[string]interface{})
	if req.Username != nil {
		updates["username"] = *req.Username
	}
	if req.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		updates["password_hash"] = string(hash)
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if len(updates) == 0 {
		return nil
	}
	return s.repo.Update(ctx, id, updates)
}

// Delete removes an admin by ID.
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
