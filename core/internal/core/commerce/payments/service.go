package payments

import (
	"context"
	"errors"
	"fmt"

	"telegram-marketplace/internal/core/commerce/payments/model"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"
)

// InvoiceCreator is the provider boundary used by the Stars checkout. Keeping
// it small makes a future payment processor independent from Telegram.
type InvoiceCreator interface {
	CreateInvoiceLink(ctx context.Context, title, description, payload, currency string, amount int64) (string, error)
}

// APIExecutor performs configured API-based product delivery.
type APIExecutor interface {
	ExecuteAPICallIdempotent(ctx context.Context, apiID, idempotencyKey string) (string, error)
}

// Service owns provider-neutral payment persistence. Telegram Stars invoice
// creation and update processing will be added on top of this layer.
type Service struct {
	botText interface {
		Text(context.Context, string, map[string]string) string
	}
	notificationSender ReviewNotificationSender
	referrals          interface{ Check(context.Context, int64) }
	repo               paymentsrepo.Repository
	invoices           InvoiceCreator
	apiExecutor        APIExecutor
	fileStorage        storage.Storage
	receiptStorage     storage.Storage
}

func (s *Service) SetBotMessageText(text interface {
	Text(context.Context, string, map[string]string) string
}) { s.botText = text }
func (s *Service) invoiceText(ctx context.Context, purpose, title, description string, amount int64) (string, string) {
	if s.botText == nil {
		return title, description
	}
	vars := map[string]string{"title": title, "description": description, "amount": fmt.Sprint(amount)}
	return s.botText.Text(ctx, "invoice."+purpose+".title", vars), s.botText.Text(ctx, "invoice."+purpose+".description", vars)
}
func (s *Service) SetReferralRewards(rewards interface{ Check(context.Context, int64) }) {
	s.referrals = rewards
}
func (s *Service) checkReferral(ctx context.Context, tg int64) {
	if s.referrals != nil {
		s.referrals.Check(ctx, tg)
	}
}

// NewService constructs the payment service.
func NewService(repo paymentsrepo.Repository, invoices InvoiceCreator, apiExecutor APIExecutor, fileStorage storage.Storage) *Service {
	return &Service{
		repo: repo, invoices: invoices, apiExecutor: apiExecutor,
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

// ListStars returns only the currently enabled Telegram Stars payments. The
// repository remains method-aware so future processors can expose dedicated
// administration endpoints without mixing provider semantics.
func (s *Service) ListStars(ctx context.Context, params pagination.Params) (*AdminPaginatedResponse, error) {
	payments, err := s.repo.ListAdminByMethod(ctx, model.MethodTelegramStars, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("payments.service.ListStars: %w", err)
	}

	summary, err := s.repo.AdminSummary(ctx, model.MethodTelegramStars)
	if err != nil {
		return nil, fmt.Errorf("payments.service.ListStars count: %w", err)
	}

	data := make([]AdminResponse, 0, len(payments))
	for _, payment := range payments {
		data = append(data, AdminResponse{Response: toResponse(&payment.Payment), User: payment.User,
			TargetTitle: payment.TargetTitle, ProductID: payment.ProductID, Quantity: payment.Quantity,
			CouponCode: payment.CouponCode, DiscountStars: payment.DiscountStars, DiscountToman: payment.DiscountToman})
	}

	return &AdminPaginatedResponse{Response: pagination.NewResponse(data, summary.Total, params), Summary: summary}, nil
}
