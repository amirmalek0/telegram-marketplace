package broadcasts

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"strings"
	"telegram-marketplace/internal/core/membership/broadcasts/model"
	"telegram-marketplace/internal/core/membership/broadcasts/repository"
	"telegram-marketplace/pkg/pagination"
	"time"
	"unicode/utf8"
)

var ErrInvalidMessage = errors.New("عنوان و متن پیام را کامل کنید؛ عنوان تا ۱۲۰ و متن تا ۴۰۰۰ نویسه")
var ErrInvalidID = errors.New("شناسه معتبر نیست")

type Service struct{ repo repository.Repository }

func NewService(repo repository.Repository) *Service { return &Service{repo: repo} }

func (s *Service) Publish(ctx context.Context, adminID string, req PublishRequest) (*model.Broadcast, error) {
	title, message := strings.TrimSpace(req.Title), strings.TrimSpace(req.Message)
	if title == "" || message == "" || utf8.RuneCountInString(title) > 120 || utf8.RuneCountInString(message) > 4000 {
		return nil, ErrInvalidMessage
	}
	if _, err := uuid.Parse(req.RequestID); err != nil {
		return nil, ErrInvalidID
	}
	if _, err := uuid.Parse(adminID); err != nil {
		return nil, ErrInvalidID
	}
	return s.repo.Publish(ctx, title, message, adminID, req.RequestID)
}

func (s *Service) List(ctx context.Context, params pagination.Params) (*pagination.Response[model.Broadcast], error) {
	items, total, err := s.repo.List(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []model.Broadcast{}
	}
	result := pagination.NewResponse(items, total, params)
	return &result, nil
}

func (s *Service) Archive(ctx context.Context, id string) error {
	if _, err := uuid.Parse(id); err != nil {
		return ErrInvalidID
	}
	return s.repo.Archive(ctx, id)
}

func (s *Service) Inbox(ctx context.Context, telegramID int64, params pagination.Params) (*InboxResponse, error) {
	items, total, unread, err := s.repo.Inbox(ctx, telegramID, params.PerPage, params.Offset())
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []model.Notification{}
	}
	return &InboxResponse{Response: pagination.NewResponse(items, total, params), UnreadCount: unread}, nil
}

func (s *Service) Unread(ctx context.Context, telegramID int64) (int64, error) {
	return s.repo.Unread(ctx, telegramID)
}
func (s *Service) MarkRead(ctx context.Context, telegramID int64, id string) (*time.Time, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrInvalidID
	}
	return s.repo.MarkRead(ctx, telegramID, id)
}
func (s *Service) MarkAllRead(ctx context.Context, telegramID int64) error {
	return s.repo.MarkAllRead(ctx, telegramID)
}
