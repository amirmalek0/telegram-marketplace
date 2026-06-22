package admins

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"telegram-marketplace/internal/core/membership/admins/model"
	"telegram-marketplace/internal/core/membership/admins/repository"
)

// validUsername matches lowercase alphanumeric strings with optional dots/underscores,
// starting with a letter, between 3 and 50 characters.
var validUsername = regexp.MustCompile(`^[a-z][a-z0-9._]{2,49}$`)

// ErrInvalidUsername is returned when the username does not meet requirements.
var ErrInvalidUsername = errors.New("username must be 3-50 lowercase alphanumeric characters (dots and underscores allowed), starting with a letter")

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

// validateUsername checks that the username is lowercase, has no spaces or invalid chars.
func validateUsername(username string) error {
	if !validUsername.MatchString(username) {
		return ErrInvalidUsername
	}
	return nil
}

// Create creates a new admin with a hashed password.
func (s *Service) Create(ctx context.Context, req CreateRequest) error {
	username := strings.ToLower(strings.TrimSpace(req.Username))
	if err := validateUsername(username); err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	admin := &model.Admin{
		ID:           uuid.New().String(),
		Username:     username,
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

// Count returns the total number of admins.
func (s *Service) Count(ctx context.Context) (int, error) {
	return s.repo.Count(ctx)
}

// Update updates an admin's fields.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) error {
	admin, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if req.Username != nil {
		username := strings.ToLower(strings.TrimSpace(*req.Username))
		if err := validateUsername(username); err != nil {
			return err
		}
		admin.Username = username
	}
	if req.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		admin.PasswordHash = string(hash)
	}
	if req.IsActive != nil {
		admin.IsActive = *req.IsActive
	}

	return s.repo.Update(ctx, admin)
}

// Delete removes an admin by ID.
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
