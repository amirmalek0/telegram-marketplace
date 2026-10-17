package users

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/membership/users/model"
	"telegram-marketplace/internal/core/membership/users/repository"
	"telegram-marketplace/pkg/pagination"
)

// Service holds the business logic for the users domain.
type Service struct {
	repo      repository.Repository
	referrals ReferralRewards
	photos    interface {
		Schedule(context.Context, string) error
		ScheduleVisit(context.Context, string) error
	}
}

func (s *Service) SetPhotoArchive(photos interface {
	Schedule(context.Context, string) error
	ScheduleVisit(context.Context, string) error
}) {
	s.photos = photos
}

type ReferralRewards interface {
	Onboard(context.Context, int64, string, string, string, string) (string, bool, error)
	Check(context.Context, int64)
}

func (s *Service) SetReferralRewards(referrals ReferralRewards) { s.referrals = referrals }

// NewService constructs a Service with the given Repository (plain DI).
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// Upsert creates a new user or updates an existing one by Telegram ID.
// Returns the user and a boolean indicating if it was created (true) or updated (false).
func (s *Service) Upsert(ctx context.Context, req CreateUserRequest) (*model.User, bool, error) {
	return s.UpsertWithReferral(ctx, req, "")
}

func (s *Service) UpsertWithReferral(ctx context.Context, req CreateUserRequest, trustedStart string) (*model.User, bool, error) {
	if s.referrals != nil {
		id, created, err := s.referrals.Onboard(ctx, req.TelegramID, req.FirstName, req.LastName, req.Username, trustedStart)
		if err != nil {
			return nil, false, err
		}
		user, err := s.repo.GetByID(ctx, id)
		if err == nil {
			err = s.syncPhoto(ctx, user, req.PhotoURL)
		}
		return user, created, err
	}
	var referredBy *int64
	if req.ReferredBy != 0 {
		referredBy = &req.ReferredBy
	}
	user := &model.User{TelegramID: req.TelegramID, FirstName: req.FirstName, LastName: req.LastName, Username: req.Username, ReferredBy: referredBy}
	created, err := s.repo.UpsertProfile(ctx, user)
	if err != nil {
		return nil, false, fmt.Errorf("users.service.Upsert: %w", err)
	}
	user, err = s.repo.GetByID(ctx, user.ID)
	if err == nil {
		err = s.syncPhoto(ctx, user, req.PhotoURL)
	}
	return user, created, err
}

// GetByID returns a user by its internal ID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.User, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("users.service.GetByID: %w", err)
	}
	return user, nil
}

// GetByTelegramID returns a user by their Telegram ID.
func (s *Service) GetByTelegramID(ctx context.Context, telegramID int64) (*model.User, error) {
	user, err := s.repo.GetByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, fmt.Errorf("users.service.GetByTelegramID: %w", err)
	}
	return user, nil
}

// List returns a paginated list of users with metadata.
func (s *Service) List(ctx context.Context, paginationParams pagination.Params) (*PaginatedResponse, error) {
	userList, err := s.repo.List(ctx, paginationParams.PerPage, paginationParams.Offset())
	if err != nil {
		return nil, fmt.Errorf("users.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("users.service.List count: %w", err)
	}

	data := make([]Response, 0, len(userList))
	for _, userModel := range userList {
		data = append(data, toResponse(userModel))
	}

	paginatedResult := pagination.NewResponse(data, total, paginationParams)
	return &paginatedResult, nil
}

// Update applies profile changes to an existing user.
func (s *Service) Update(ctx context.Context, id string, req UpdateUserRequest) (*model.User, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("users.service.Update: %w", err)
	}

	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		user.LastName = *req.LastName
	}
	if req.Username != nil {
		user.Username = *req.Username
	}
	if req.PhoneNumber != nil {
		if user.PhoneNumber != *req.PhoneNumber {
			user.PhoneVerifiedAt = nil
		}
		user.PhoneNumber = *req.PhoneNumber
	}

	if err := s.repo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("users.service.Update: %w", err)
	}
	return user, nil
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
