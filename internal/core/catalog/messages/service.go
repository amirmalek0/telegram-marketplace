package messages

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/catalog/messages/model"
	"telegram-marketplace/internal/core/catalog/messages/repository"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// Service holds the business logic for the messages domain.
type Service struct {
	repo repository.Repository
}

// NewService constructs a Service with the given Repository.
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// Create stores a new delivery message.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*model.DeliveryMessage, error) {
	msg := &model.DeliveryMessage{
		Content:   req.Content,
		CreatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, msg); err != nil {
		return nil, fmt.Errorf("messages.service.Create: %w", err)
	}

	return msg, nil
}

// GetByID returns a message by its internal UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.DeliveryMessage, error) {
	msg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("messages.service.GetByID: %w", err)
	}
	return msg, nil
}

// List returns a paginated list of messages ordered by creation date.
func (s *Service) List(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	msgs, err := s.repo.List(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("messages.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("messages.service.List count: %w", err)
	}

	data := make([]Response, 0, len(msgs))
	for _, m := range msgs {
		data = append(data, toResponse(m))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// Update modifies the content of an existing message.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*model.DeliveryMessage, error) {
	msg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("messages.service.Update: %w", err)
	}

	if req.Content != nil {
		msg.Content = *req.Content
	}

	if err := s.repo.Update(ctx, msg); err != nil {
		return nil, fmt.Errorf("messages.service.Update: %w", err)
	}

	return msg, nil
}

// Delete removes a message from the database.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("messages.service.Delete: %w", err)
	}
	return nil
}
