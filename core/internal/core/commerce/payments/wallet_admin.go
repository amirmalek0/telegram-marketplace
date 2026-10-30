package payments

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/pkg/pagination"
)

var ErrWalletWouldBeNegative = paymentsrepo.ErrWalletWouldBeNegative
var ErrVIPQuoteFailed = errors.New("VIP quote calculation failed")

func topupPackResponse(item paymentsrepo.WalletTopupPack) WalletTopupPackResponse {
	return WalletTopupPackResponse{TomanPrice: item.TomanPrice, ID: item.ID, Title: item.Title, Stars: item.Stars, Status: item.Status, SortOrder: item.SortOrder, CreatedAt: item.CreatedAt, UpdatedAt: item.UpdatedAt}
}
func walletTransactionResponse(item paymentsrepo.WalletTransaction) WalletTransactionResponse {
	return WalletTransactionResponse{ID: item.ID, Type: item.Type, Amount: item.Amount, BalanceBefore: item.BalanceBefore, BalanceAfter: item.BalanceAfter, Description: item.Description, CreatedAt: item.CreatedAt}
}
func adminWalletResponse(item paymentsrepo.AdminWallet) AdminWalletResponse {
	return AdminWalletResponse{PhotoURL: item.PhotoURL, PhoneNumber: item.PhoneNumber, UserID: item.UserID, FirstName: item.FirstName, LastName: item.LastName, Username: item.Username, TelegramID: item.TelegramID, Balance: item.Balance, HasActivePlan: item.HasActivePlan, PlanExpireAt: item.PlanExpireAt, TransactionCount: item.TransactionCount}
}
func adminWalletDetailResponse(item *paymentsrepo.AdminWalletDetail) *AdminWalletDetailResponse {
	result := &AdminWalletDetailResponse{Wallet: adminWalletResponse(item.Wallet), Transactions: make([]WalletTransactionResponse, 0, len(item.Transactions))}
	for _, transaction := range item.Transactions {
		result.Transactions = append(result.Transactions, walletTransactionResponse(transaction))
	}
	return result
}

func (s *Service) ListWalletTopupPacks(ctx context.Context, activeOnly bool) ([]WalletTopupPackResponse, error) {
	items, err := s.repo.ListWalletTopupPacks(ctx, activeOnly)
	if err != nil {
		return nil, err
	}
	result := make([]WalletTopupPackResponse, 0, len(items))
	for _, item := range items {
		result = append(result, topupPackResponse(item))
	}
	return result, nil
}
func (s *Service) CreateWalletTopupPack(ctx context.Context, req CreateWalletTopupPackRequest) (*WalletTopupPackResponse, error) {
	item, err := s.repo.CreateWalletTopupPack(ctx, paymentsrepo.WalletTopupPack{TomanPrice: req.TomanPrice, Title: req.Title, Stars: req.Stars, Status: req.Status, SortOrder: req.SortOrder})
	if err != nil {
		return nil, err
	}
	response := topupPackResponse(*item)
	return &response, nil
}
func (s *Service) UpdateWalletTopupPack(ctx context.Context, id string, req UpdateWalletTopupPackRequest) (*WalletTopupPackResponse, error) {
	item, err := s.repo.UpdateWalletTopupPack(ctx, paymentsrepo.WalletTopupPack{TomanPrice: req.TomanPrice, ID: id, Title: req.Title, Stars: req.Stars, Status: req.Status, SortOrder: req.SortOrder})
	if err != nil {
		return nil, err
	}
	response := topupPackResponse(*item)
	return &response, nil
}
func (s *Service) DeleteWalletTopupPack(ctx context.Context, id string) error {
	return s.repo.DeleteWalletTopupPack(ctx, id)
}

func (s *Service) ListAdminWallets(ctx context.Context, params pagination.Params) (*AdminWalletsPaginatedResponse, error) {
	items, err := s.repo.ListAdminWallets(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, err
	}
	total, err := s.repo.CountUsers(ctx)
	if err != nil {
		return nil, err
	}
	data := make([]AdminWalletResponse, 0, len(items))
	for _, item := range items {
		data = append(data, adminWalletResponse(item))
	}
	result := pagination.NewResponse(data, total, params)
	return &result, nil
}
func (s *Service) AdminWalletDetail(ctx context.Context, userID string) (*AdminWalletDetailResponse, error) {
	item, err := s.repo.AdminWalletDetail(ctx, userID)
	if err != nil {
		return nil, err
	}
	return adminWalletDetailResponse(item), nil
}
func (s *Service) AdjustWallet(ctx context.Context, userID string, amount int64, description string) (*AdminWalletDetailResponse, error) {
	if amount == 0 {
		return nil, ErrInvalidCheckout
	}
	item, err := s.repo.AdjustWallet(ctx, userID, amount, description)
	if err != nil {
		return nil, err
	}
	return adminWalletDetailResponse(item), nil
}

func (s *Service) VIPQuote(ctx context.Context, telegramID int64, planID string) (*VIPQuoteResponse, error) {
	data, err := s.repo.GetVIPQuoteData(ctx, telegramID, planID)
	if errors.Is(err, ErrCheckoutUnavailable) {
		return nil, ErrCheckoutUnavailable
	}
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrVIPQuoteFailed, err)
	}
	if data.OriginalStars <= 0 {
		return nil, ErrCheckoutUnavailable
	}
	quote := &VIPQuoteResponse{PlanID: planID, PlanTitle: data.PlanTitle, OriginalStars: data.OriginalStars, PayableStars: data.OriginalStars, TargetTier: data.TargetTier, CurrentPlanID: data.CurrentPlanID, CurrentExpireAt: data.CurrentExpireAt, CurrentPlanTitle: data.CurrentPlanTitle, CurrentTier: data.CurrentTier}
	if data.CurrentPlanID == nil || data.CurrentExpireAt == nil || !data.CurrentExpireAt.After(time.Now()) || *data.CurrentPlanID == planID || data.TargetTier <= data.CurrentTier || data.CurrentDuration <= 0 || data.CurrentPrice <= 0 {
		return quote, nil
	}
	remainingSeconds := int64(time.Until(*data.CurrentExpireAt).Seconds())
	if remainingSeconds <= 0 {
		return quote, nil
	}
	quote.RemainingDays = int(math.Ceil(float64(remainingSeconds) / float64(24*time.Hour/time.Second)))
	quote.CreditStars = remainingSeconds * data.CurrentPrice / (int64(data.CurrentDuration) * int64(24*time.Hour/time.Second))
	if quote.CreditStars >= quote.OriginalStars {
		quote.CreditStars = quote.OriginalStars - 1
	}
	if quote.CreditStars < 0 {
		quote.CreditStars = 0
	}
	quote.PayableStars = quote.OriginalStars - quote.CreditStars
	quote.IsUpgrade = true
	return quote, nil
}
