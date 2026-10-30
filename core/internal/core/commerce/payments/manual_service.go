package payments

import (
	"context"
	"errors"
	"io"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"telegram-marketplace/internal/core/commerce/payments/manual"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/pkg/storage"
)

func (s *Service) SetReceiptStorage(store storage.Storage) { s.receiptStorage = store }

func (s *Service) manualRepository() (paymentsrepo.ManualRepository, error) {
	r, ok := s.repo.(paymentsrepo.ManualRepository)
	if !ok {
		return nil, manual.ErrUnavailable
	}
	return r, nil
}

func (s *Service) ManualConfig(ctx context.Context) (*manual.Config, error) {
	r, err := s.manualRepository()
	if err != nil {
		return nil, err
	}
	return r.ManualConfig(ctx)
}

func (s *Service) SaveManualConfig(ctx context.Context, c manual.Config, adminID string) (*manual.Config, error) {
	// Activation is managed only by the general payment policy. Card drafts
	// may be saved before the provider is ready; checkout validates readiness.
	c.Enabled = false
	validated, err := manual.ValidateConfig(c)
	if err != nil {
		return nil, err
	}
	r, err := s.manualRepository()
	if err != nil {
		return nil, err
	}
	return r.SaveManualConfig(ctx, validated, adminID)
}

func validManualTarget(purpose, id string) bool {
	_, err := uuid.Parse(id)
	return err == nil && manual.ValidPurpose(purpose)
}

func (s *Service) ManualPrices(ctx context.Context, limit, offset int) ([]manual.Price, error) {
	r, err := s.manualRepository()
	if err != nil {
		return nil, err
	}
	return r.ManualPrices(ctx, limit, offset)
}

func (s *Service) ManualPrice(ctx context.Context, purpose, id string) (*manual.Price, error) {
	if !validManualTarget(purpose, id) {
		return nil, manual.ErrInvalid
	}
	r, err := s.manualRepository()
	if err != nil {
		return nil, err
	}
	return r.ManualPrice(ctx, purpose, id)
}

func (s *Service) SetManualPrice(ctx context.Context, purpose, id string, toman int64) error {
	if !validManualTarget(purpose, id) || toman < 0 || toman > manual.MaxToman {
		return manual.ErrInvalid
	}
	r, err := s.manualRepository()
	if err != nil {
		return err
	}
	return r.SetManualPrice(ctx, purpose, id, toman)
}

func (s *Service) CreateManualCheckout(ctx context.Context, tg int64, purpose, targetID, requestID string, codes ...string) (*manual.Checkout, error) {
	if !validManualTarget(purpose, targetID) || tg <= 0 {
		return nil, manual.ErrInvalid
	}
	if _, err := uuid.Parse(requestID); err != nil {
		return nil, manual.ErrInvalid
	}
	r, err := s.manualRepository()
	if err != nil {
		return nil, err
	}
	result, err := r.CreateManualCheckout(ctx, tg, purpose, targetID, requestID, codes...)
	if err == nil && result.Status == "approved" && !result.IsTest {
		if result.DeliveryID != "" {
			_ = s.fulfillAPIDelivery(ctx, result.DeliveryID)
		}
		if result.Toman > 0 {
			s.checkReferral(ctx, tg)
		}
	}
	return result, err
}

func (s *Service) GetManualCheckout(ctx context.Context, id string, tg int64) (*manual.Checkout, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, manual.ErrInvalid
	}
	r, err := s.manualRepository()
	if err != nil {
		return nil, err
	}
	return r.GetManualCheckout(ctx, id, tg)
}

func (s *Service) ListManualCheckouts(ctx context.Context, tg int64, status string, limit, offset int) ([]manual.Checkout, error) {
	if status != "" && status != "awaiting_proof" && status != "submitted" && status != "approved" && status != "rejected" && status != "cancelled" {
		return nil, manual.ErrInvalid
	}
	r, err := s.manualRepository()
	if err != nil {
		return nil, err
	}
	return r.ListManualCheckouts(ctx, tg, status, limit, offset)
}

func (s *Service) SubmitManualProof(ctx context.Context, tg int64, id, transaction, cardID string, source io.Reader) (*manual.Checkout, error) {
	transaction, err := manual.NormalizeTransactionID(transaction)
	if err != nil {
		return nil, err
	}
	if transaction == "" && source == nil {
		return nil, manual.ErrInvalid
	}
	c, err := s.GetManualCheckout(ctx, id, tg)
	if err != nil {
		return nil, err
	}
	if c.Status != "awaiting_proof" {
		return nil, manual.ErrConflict
	}
	validCard := false
	for _, card := range c.Cards {
		if card.ID == cardID {
			validCard = true
		}
	}
	if !validCard {
		return nil, manual.ErrInvalid
	}
	key, hash := "", ""
	if source != nil {
		key, hash, err = s.uploadManualReceipt(ctx, id, source)
		if err != nil {
			return nil, err
		}
	}
	r, err := s.manualRepository()
	if err != nil {
		return nil, err
	}
	if err = r.SubmitManualProof(ctx, tg, id, transaction, cardID, key, hash); err != nil {
		// The object belongs only to this attempt; never delete another submission's receipt.
		if key != "" {
			cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
			_ = s.receiptStorage.Delete(cleanup, key)
			cancel()
		}
		return nil, err
	}
	return r.GetManualCheckout(ctx, id, tg)
}

func (s *Service) ReviewManualPayment(ctx context.Context, id, adminID string, approve bool, note string) (*manual.Checkout, error) {
	note = strings.TrimSpace(note)
	if utf8.RuneCountInString(note) > 1000 || !approve && note == "" {
		return nil, manual.ErrInvalid
	}
	if _, err := uuid.Parse(id); err != nil {
		return nil, manual.ErrInvalid
	}
	r, err := s.manualRepository()
	if err != nil {
		return nil, err
	}
	result, err := r.ReviewManualPayment(ctx, id, adminID, approve, note)
	if err != nil {
		return nil, err
	}
	if approve && !result.Test {
		if result.DeliveryID != "" {
			_ = s.fulfillAPIDelivery(ctx, result.DeliveryID)
		}
		s.checkReferral(ctx, result.TelegramID)
	}
	return r.GetManualCheckout(ctx, id, 0)
}

func (s *Service) CancelManualPayment(ctx context.Context, tg int64, id string) error {
	if _, err := uuid.Parse(id); err != nil {
		return manual.ErrInvalid
	}
	r, err := s.manualRepository()
	if err != nil {
		return err
	}
	return r.CancelManualPayment(ctx, tg, id)
}

func (s *Service) OpenManualReceipt(ctx context.Context, id string, tg int64) (io.ReadCloser, int64, error) {
	c, err := s.GetManualCheckout(ctx, id, tg)
	if err != nil {
		return nil, 0, err
	}
	if c.ReceiptKey == "" {
		return nil, 0, paymentsrepo.ErrNotFound
	}
	reader, ok := s.receiptStorage.(storage.Reader)
	if !ok {
		return nil, 0, errors.New("receipt storage unavailable")
	}
	body, size, mime, err := reader.Open(ctx, c.ReceiptKey)
	if err != nil {
		return nil, 0, err
	}
	if mime != "image/png" {
		body.Close()
		return nil, 0, manual.ErrInvalid
	}
	return body, size, nil
}
