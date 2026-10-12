package payments

import (
	"context"
	"errors"
	"fmt"

	"telegram-marketplace/internal/core/commerce/payments/model"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InvoiceCreator is the provider boundary used by the Stars checkout. Keeping
// it small makes a future payment processor independent from Telegram.
type InvoiceCreator interface {
	CreateInvoiceLink(ctx context.Context, title, description, payload, currency string, amount int64) (string, error)
}

// APIExecutor performs configured API-based product delivery.
type APIExecutor interface {
	ExecuteAPICall(ctx context.Context, apiID string) (string, error)
}

// Service owns provider-neutral payment persistence. Telegram Stars invoice
// creation and update processing will be added on top of this layer.
type Service struct {
	repo        paymentsrepo.Repository
	db          *pgxpool.Pool
	invoices    InvoiceCreator
	apiExecutor APIExecutor
	fileStorage storage.Storage
}

// NewService constructs the payment service.
func NewService(repo paymentsrepo.Repository, db *pgxpool.Pool, invoices InvoiceCreator, apiExecutor APIExecutor, fileStorage storage.Storage) *Service {
	return &Service{
		repo: repo, db: db, invoices: invoices, apiExecutor: apiExecutor,
		fileStorage: fileStorage,
	}
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
