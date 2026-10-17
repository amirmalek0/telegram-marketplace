package payments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	paymentsmodel "telegram-marketplace/internal/core/commerce/payments/model"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
)

var (
	ErrCheckoutUnavailable = paymentsrepo.ErrCheckoutUnavailable
	ErrAlreadyPurchased    = paymentsrepo.ErrAlreadyPurchased
	ErrInsufficientBalance = paymentsrepo.ErrInsufficientBalance
	ErrOutOfStock          = paymentsrepo.ErrOutOfStock
	ErrInvalidCheckout     = paymentsrepo.ErrInvalidCheckout
)

type CouponError = paymentsrepo.CouponError

// CreateStarsInvoice creates the pending checkout atomically in the repository,
// then asks Telegram for the invoice URL.
func (s *Service) CreateStarsInvoice(ctx context.Context, telegramID int64, productID, couponCode string) (*CreateStarsInvoiceResponse, error) {
	if s.invoices == nil {
		return nil, errors.New("stars checkout is not configured")
	}
	if err := s.repo.ReleaseExpiredReservations(ctx); err != nil {
		return nil, fmt.Errorf("payments checkout release expired reservations: %w", err)
	}
	config, err := s.GetPaymentConfig(ctx)
	if err != nil {
		return nil, err
	}
	record, err := s.repo.CreateProductStarsCheckout(ctx, telegramID, productID, uuid.NewString(), config.TestMode, couponCode)
	if err != nil {
		return nil, err
	}
	if record.Completed {
		_ = s.fulfillAPIDelivery(ctx, record.DeliveryID)
		return &CreateStarsInvoiceResponse{OrderID: record.OrderID, Completed: true, Purpose: "product", WalletBalance: record.WalletBalance}, nil
	}
	if config.TestMode {
		return &CreateStarsInvoiceResponse{
			OrderID: record.OrderID, PaymentID: record.PaymentID, Stars: record.Stars,
			Purpose: "product", SimulationEnabled: true,
		}, nil
	}

	title := truncateRunes(strings.TrimSpace(record.ProductTitle), 32)
	description := strings.TrimSpace(record.ProductDescription)
	if description == "" {
		description = "خرید " + record.ProductTitle
	}
	description = truncateRunes(description, 255)
	invoiceURL, err := s.invoices.CreateInvoiceLink(ctx, title, description, record.CheckoutReference, paymentsmodel.StarsCurrency, record.Stars)
	if err != nil {
		_ = s.repo.FailCheckout(ctx, record.OrderID, record.PaymentID, "telegram invoice creation failed", false)
		return nil, fmt.Errorf("payments checkout create invoice: %w", err)
	}
	return &CreateStarsInvoiceResponse{
		OrderID: record.OrderID, PaymentID: record.PaymentID, InvoiceURL: invoiceURL,
		Stars: record.Stars, Purpose: "product",
	}, nil
}

// SimulateStarsPayment follows the same settlement paths as Telegram, but only
// for payments created while the global payment setting was in test mode.
func (s *Service) SimulateStarsPayment(ctx context.Context, telegramID int64, paymentID, outcome string) (*SimulateStarsPaymentResponse, error) {
	payment, err := s.repo.GetTestPayment(ctx, telegramID, paymentID)
	if err != nil || payment.Status != "pending" {
		return nil, ErrInvalidCheckout
	}

	switch outcome {
	case "succeeded":
		raw := mustJSON(map[string]any{"simulated": true, "outcome": outcome, "payment_id": paymentID})
		referenceID, settleErr := s.SettleStarsPayment(ctx, SuccessfulPaymentInput{
			TelegramID: telegramID, Currency: payment.Currency, TotalAmount: payment.Amount,
			InvoicePayload: payment.Payload, TelegramChargeID: "test:" + uuid.NewString(), Raw: raw,
		})
		if settleErr != nil {
			if referenceID != "" {
				return &SimulateStarsPaymentResponse{
					OrderID: stringValue(payment.OrderID), ReferenceID: referenceID, Purpose: payment.Purpose,
					Status: "succeeded", DeliveryStatus: "failed", DeliveryError: settleErr.Error(),
				}, nil
			}
			return nil, settleErr
		}
		deliveryStatus, deliveryError := "", ""
		if payment.OrderID != nil {
			deliveryStatus, deliveryError = s.repo.DeliveryOutcome(ctx, *payment.OrderID)
		}
		balance, _ := s.repo.WalletBalanceByTelegramID(ctx, telegramID)
		return &SimulateStarsPaymentResponse{
			OrderID: stringValue(payment.OrderID), ReferenceID: referenceID, Purpose: payment.Purpose,
			Status: "succeeded", DeliveryStatus: deliveryStatus, DeliveryError: deliveryError, WalletBalance: balance,
		}, nil
	case "failed", "cancelled":
		reason := "simulated " + outcome
		if payment.OrderID != nil {
			err = s.repo.FailCheckout(ctx, *payment.OrderID, paymentID, reason, outcome == "cancelled")
		} else {
			err = s.repo.FailStandalonePayment(ctx, paymentID, reason)
		}
		if err != nil {
			return nil, err
		}
		return &SimulateStarsPaymentResponse{
			OrderID: stringValue(payment.OrderID), ReferenceID: paymentID,
			Purpose: payment.Purpose, Status: outcome,
		}, nil
	default:
		return nil, ErrInvalidCheckout
	}
}

func truncateRunes(value string, max int) string {
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func mustJSON(value any) []byte {
	data, _ := json.Marshal(value)
	return data
}

// ValidatePreCheckout rechecks amount, currency, owner, and reservation before
// Telegram accepts the payment.
func (s *Service) ValidatePreCheckout(ctx context.Context, telegramID int64, payload, currency string, amount int64) error {
	return s.repo.ValidatePreCheckout(ctx, telegramID, payload, currency, amount)
}

type SuccessfulPaymentInput struct {
	TelegramID       int64
	ChatID           int64
	Currency         string
	TotalAmount      int64
	InvoicePayload   string
	TelegramChargeID string
	ProviderChargeID string
	Raw              []byte
}

// SettleStarsPayment is idempotent. The repository owns the transaction that
// marks the payment paid and unlocks its delivery.
func (s *Service) SettleStarsPayment(ctx context.Context, input SuccessfulPaymentInput) (string, error) {
	result, err := s.repo.SettleStarsPayment(ctx, paymentsrepo.SettlementInput{
		TelegramID: input.TelegramID, Currency: input.Currency, TotalAmount: input.TotalAmount,
		InvoicePayload: input.InvoicePayload, TelegramChargeID: input.TelegramChargeID,
		ProviderChargeID: input.ProviderChargeID, Raw: input.Raw,
	})
	if err != nil {
		return "", err
	}
	s.checkReferral(ctx, input.TelegramID)
	if result.DeliveryID != "" {
		if err := s.fulfillAPIDelivery(ctx, result.DeliveryID); err != nil {
			return result.ReferenceID, err
		}
	}
	return result.ReferenceID, nil
}

func (s *Service) fulfillAPIDelivery(ctx context.Context, deliveryID string) error {
	if s.apiExecutor == nil {
		return nil
	}
	items, err := s.repo.ListPendingAPIDeliveryItems(ctx, deliveryID)
	if err != nil {
		return err
	}
	for _, item := range items {
		claimed, err := s.repo.ClaimAPIDeliveryItem(ctx, item.ID)
		if err != nil || !claimed {
			continue
		}
		content, executeErr := s.apiExecutor.ExecuteAPICall(ctx, item.APIID)
		if executeErr != nil {
			_ = s.repo.FailAPIDeliveryItem(ctx, deliveryID, item.ID, executeErr.Error())
			return fmt.Errorf("payments API delivery: %w", executeErr)
		}
		if err := s.repo.CompleteAPIDeliveryItem(ctx, item.ID, content); err != nil {
			return err
		}
	}
	return s.repo.CompleteAPIDelivery(ctx, deliveryID)
}
