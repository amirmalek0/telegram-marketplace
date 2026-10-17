package payments

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	paymentsmodel "telegram-marketplace/internal/core/commerce/payments/model"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
)

// CreateProductCheckout selects free VIP access, wallet settlement, or a
// Telegram Stars invoice while leaving persistence to the repository.
func (s *Service) CreateProductCheckout(ctx context.Context, telegramID int64, productID, method, couponCode string) (*CreateStarsInvoiceResponse, error) {
	if method != string(paymentsmodel.MethodTelegramStars) && method != string(paymentsmodel.MethodWallet) {
		return nil, ErrInvalidCheckout
	}
	vipOnly, activeVIP, err := s.repo.ProductAccess(ctx, telegramID, productID)
	if err != nil {
		return nil, ErrCheckoutUnavailable
	}
	if vipOnly && activeVIP {
		return s.createImmediateProductCheckout(ctx, telegramID, productID, true, "")
	}
	if method == string(paymentsmodel.MethodWallet) {
		return s.createImmediateProductCheckout(ctx, telegramID, productID, false, couponCode)
	}
	return s.CreateStarsInvoice(ctx, telegramID, productID, couponCode)
}

func (s *Service) createImmediateProductCheckout(ctx context.Context, telegramID int64, productID string, vipAccess bool, couponCode string) (*CreateStarsInvoiceResponse, error) {
	if err := s.repo.ReleaseExpiredReservations(ctx); err != nil {
		return nil, err
	}
	record, err := s.repo.CreateImmediateProductCheckout(ctx, telegramID, productID, "wallet:"+uuid.NewString(), vipAccess, couponCode)
	if err != nil {
		return nil, err
	}
	// The purchase is already settled. API delivery persists its own failure so
	// the client must not retry and accidentally create another paid order.
	_ = s.fulfillAPIDelivery(ctx, record.DeliveryID)
	s.checkReferral(ctx, telegramID)
	return &CreateStarsInvoiceResponse{
		OrderID: record.OrderID, PaymentID: record.PaymentID, Stars: record.Stars,
		Completed: true, Purpose: "product", WalletBalance: record.WalletBalance,
	}, nil
}

// CreateVIPCheckout buys or upgrades a VIP membership. Wallet purchases settle
// immediately; Stars purchases use the global test/production setting.
func (s *Service) CreateVIPCheckout(ctx context.Context, telegramID int64, planID, method string) (*CreateStarsInvoiceResponse, error) {
	if method != string(paymentsmodel.MethodTelegramStars) && method != string(paymentsmodel.MethodWallet) {
		return nil, ErrInvalidCheckout
	}
	quote, err := s.VIPQuote(ctx, telegramID, planID)
	if err != nil {
		return nil, err
	}
	duration, err := s.repo.GetVIPPlanDuration(ctx, planID)
	if err != nil || quote.PayableStars <= 0 {
		return nil, ErrCheckoutUnavailable
	}
	checkoutData := string(mustJSON(map[string]any{
		"plan_title": quote.PlanTitle, "duration_days": duration, "stars_price": quote.PayableStars,
		"original_stars": quote.OriginalStars, "credit_stars": quote.CreditStars,
		"is_upgrade": quote.IsUpgrade, "remaining_days": quote.RemainingDays,
	}))

	if method == string(paymentsmodel.MethodTelegramStars) {
		return s.createStandaloneStarsInvoice(ctx, telegramID, "vip_plan", &planID, quote.PayableStars,
			quote.PlanTitle, fmt.Sprintf("اشتراک VIP برای %d روز", duration), checkoutData)
	}
	record, err := s.repo.CreateVIPWalletCheckout(ctx, paymentsrepo.VIPWalletCheckoutInput{
		TelegramID: telegramID, PlanID: planID, Stars: quote.PayableStars,
		PlanTitle: quote.PlanTitle, CheckoutReference: "wallet:" + uuid.NewString(), CheckoutData: checkoutData,
	})
	if err != nil {
		return nil, err
	}
	s.checkReferral(ctx, telegramID)
	return &CreateStarsInvoiceResponse{
		PaymentID: record.PaymentID, Stars: record.Stars, Completed: true,
		Purpose: "vip_plan", WalletBalance: record.WalletBalance,
	}, nil
}

// CreateWalletTopup creates a Stars invoice whose settlement credits the wallet.
func (s *Service) CreateWalletTopup(ctx context.Context, telegramID int64, packID string) (*CreateStarsInvoiceResponse, error) {
	pack, err := s.repo.GetActiveWalletTopupPack(ctx, packID)
	if err != nil || pack.Stars <= 0 {
		return nil, ErrInvalidCheckout
	}
	checkoutData := string(mustJSON(map[string]any{"pack_id": packID, "pack_title": pack.Title, "stars": pack.Stars}))
	return s.createStandaloneStarsInvoice(ctx, telegramID, "wallet_topup", &packID, pack.Stars,
		pack.Title, fmt.Sprintf("افزایش موجودی کیف پول به اندازه %d استار", pack.Stars), checkoutData)
}

func (s *Service) createStandaloneStarsInvoice(ctx context.Context, telegramID int64, purpose string, targetID *string, stars int64, title, description, checkoutData string) (*CreateStarsInvoiceResponse, error) {
	if s.invoices == nil {
		return nil, errors.New("stars checkout is not configured")
	}
	config, err := s.GetPaymentConfig(ctx)
	if err != nil {
		return nil, err
	}
	record, err := s.repo.CreateStandalonePayment(ctx, paymentsrepo.StandalonePaymentInput{
		TelegramID: telegramID, Purpose: purpose, TargetID: targetID, Stars: stars,
		CheckoutReference: uuid.NewString(), CheckoutData: checkoutData, TestMode: config.TestMode,
	})
	if err != nil {
		return nil, err
	}
	if config.TestMode {
		return &CreateStarsInvoiceResponse{
			PaymentID: record.PaymentID, Stars: stars, SimulationEnabled: true, Purpose: purpose,
		}, nil
	}
	title = truncateRunes(strings.TrimSpace(title), 32)
	description = truncateRunes(description, 255)
	invoiceURL, err := s.invoices.CreateInvoiceLink(ctx, title, description, record.CheckoutReference, paymentsmodel.StarsCurrency, stars)
	if err != nil {
		_ = s.repo.FailStandalonePayment(ctx, record.PaymentID, "telegram invoice creation failed")
		return nil, err
	}
	return &CreateStarsInvoiceResponse{PaymentID: record.PaymentID, InvoiceURL: invoiceURL, Stars: stars, Purpose: purpose}, nil
}

func (s *Service) walletBalanceByTelegramID(ctx context.Context, telegramID int64) (int64, error) {
	return s.repo.WalletBalanceByTelegramID(ctx, telegramID)
}

func (s *Service) Wallet(ctx context.Context, telegramID int64) (*WalletResponse, error) {
	wallet, err := s.repo.WalletByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, ErrInvalidCheckout
	}
	response := &WalletResponse{Balance: wallet.Balance, Transactions: make([]WalletTransactionResponse, 0, len(wallet.Transactions))}
	for _, transaction := range wallet.Transactions {
		response.Transactions = append(response.Transactions, walletTransactionResponse(transaction))
	}
	return response, nil
}
