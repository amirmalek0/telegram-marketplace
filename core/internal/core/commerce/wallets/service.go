package wallets

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/commerce/wallets/model"
	"telegram-marketplace/internal/core/commerce/wallets/repository"
	userrepo "telegram-marketplace/internal/core/membership/users/repository"
	"telegram-marketplace/pkg/pagination"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrInsufficientBalance is returned when a debit operation would result in negative balance.
var ErrInsufficientBalance = fmt.Errorf("insufficient wallet balance")

// Service holds the business logic for the wallet domain.
type Service struct {
	txRepo   repository.Repository
	userRepo userrepo.Repository
	db       *pgxpool.Pool
}

// NewService constructs a Service with the given repositories and database pool.
func NewService(txRepo repository.Repository, userRepo userrepo.Repository, db *pgxpool.Pool) *Service {
	return &Service{
		txRepo:   txRepo,
		userRepo: userRepo,
		db:       db,
	}
}

// Credit adds funds to a user's wallet and records the transaction.
func (s *Service) Credit(ctx context.Context, userID string, amount float64, txType model.TransactionType, description string) (*model.WalletTransaction, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("wallets.service.Credit: amount must be positive")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("wallets.service.Credit: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get current balance
	balance, err := s.userRepo.GetWalletBalance(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("wallets.service.Credit: get balance: %w", err)
	}

	newBalance := balance + amount

	// Create transaction record
	walletTx := &model.WalletTransaction{
		UserID:        userID,
		Type:          txType,
		Amount:        amount,
		BalanceBefore: balance,
		BalanceAfter:  newBalance,
		Description:   description,
		CreatedAt:     time.Now(),
	}

	if err := s.txRepo.Create(ctx, walletTx); err != nil {
		return nil, fmt.Errorf("wallets.service.Credit: create tx: %w", err)
	}

	// Update user's wallet balance
	if err := s.userRepo.UpdateWalletBalance(ctx, userID, newBalance); err != nil {
		return nil, fmt.Errorf("wallets.service.Credit: update balance: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("wallets.service.Credit: commit tx: %w", err)
	}

	return walletTx, nil
}

// Debit deducts funds from a user's wallet and records the transaction.
// Returns ErrInsufficientBalance if the user doesn't have enough funds.
func (s *Service) Debit(ctx context.Context, userID string, amount float64, txType model.TransactionType, description string) (*model.WalletTransaction, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("wallets.service.Debit: amount must be positive")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("wallets.service.Debit: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get current balance
	balance, err := s.userRepo.GetWalletBalance(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("wallets.service.Debit: get balance: %w", err)
	}

	if balance < amount {
		return nil, ErrInsufficientBalance
	}

	newBalance := balance - amount

	// Create transaction record
	walletTx := &model.WalletTransaction{
		UserID:        userID,
		Type:          txType,
		Amount:        amount,
		BalanceBefore: balance,
		BalanceAfter:  newBalance,
		Description:   description,
		CreatedAt:     time.Now(),
	}

	if err := s.txRepo.Create(ctx, walletTx); err != nil {
		return nil, fmt.Errorf("wallets.service.Debit: create tx: %w", err)
	}

	// Update user's wallet balance
	if err := s.userRepo.UpdateWalletBalance(ctx, userID, newBalance); err != nil {
		return nil, fmt.Errorf("wallets.service.Debit: update balance: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("wallets.service.Debit: commit tx: %w", err)
	}

	return walletTx, nil
}

// GetBalance returns the current wallet balance for a user.
func (s *Service) GetBalance(ctx context.Context, userID string) (float64, error) {
	balance, err := s.userRepo.GetWalletBalance(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("wallets.service.GetBalance: %w", err)
	}
	return balance, nil
}

// GetBalanceByTelegramID returns the current wallet balance for a user identified by telegram_id.
func (s *Service) GetBalanceByTelegramID(ctx context.Context, telegramID int64) (float64, error) {
	user, err := s.userRepo.GetByTelegramID(ctx, telegramID)
	if err != nil {
		return 0, fmt.Errorf("wallets.service.GetBalanceByTelegramID: get user: %w", err)
	}
	return user.WalletBalance, nil
}

// GetTransactions returns a paginated list of wallet transactions for a user.
func (s *Service) GetTransactions(ctx context.Context, userID string, params pagination.Params) (*PaginatedTransactionsResponse, error) {
	txList, err := s.txRepo.ListByUserID(ctx, userID, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("wallets.service.GetTransactions: list: %w", err)
	}

	total, err := s.txRepo.CountByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("wallets.service.GetTransactions: count: %w", err)
	}

	data := make([]TransactionResponse, 0, len(txList))
	for _, tx := range txList {
		data = append(data, toTransactionResponse(tx))
	}

	paginatedResult := pagination.NewResponse(data, total, params)
	return &paginatedResult, nil
}

// GetTransactionsByTelegramID returns a paginated list of wallet transactions for a user identified by telegram_id.
func (s *Service) GetTransactionsByTelegramID(ctx context.Context, telegramID int64, params pagination.Params) (*PaginatedTransactionsResponse, error) {
	user, err := s.userRepo.GetByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, fmt.Errorf("wallets.service.GetTransactionsByTelegramID: get user: %w", err)
	}
	return s.GetTransactions(ctx, user.ID, params)
}
