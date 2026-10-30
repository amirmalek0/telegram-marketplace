package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type WalletTopupPack struct {
	TomanPrice int64
	ID         string
	Title      string
	Stars      int64
	Status     string
	SortOrder  int
	CreatedAt  time.Time
	UpdatedAt  time.Time
}
type WalletTransaction struct {
	ID            string
	Type          string
	Amount        int64
	BalanceBefore int64
	BalanceAfter  int64
	Description   string
	CreatedAt     time.Time
}
type Wallet struct {
	Balance      int64
	Transactions []WalletTransaction
}
type AdminWallet struct {
	PhotoURL         string
	PhoneNumber      string
	UserID           string
	FirstName        string
	LastName         string
	Username         string
	TelegramID       int64
	Balance          int64
	HasActivePlan    bool
	PlanExpireAt     *time.Time
	TransactionCount int64
}
type AdminWalletDetail struct {
	Wallet       AdminWallet
	Transactions []WalletTransaction
}
type VIPQuoteData struct {
	PlanTitle        string
	OriginalStars    int64
	TargetTier       int
	CurrentPlanID    *string
	CurrentExpireAt  *time.Time
	CurrentPlanTitle string
	CurrentPrice     int64
	CurrentDuration  int
	CurrentTier      int
}

func scanPack(row pgx.Row) (*WalletTopupPack, error) {
	var item WalletTopupPack
	err := row.Scan(&item.ID, &item.Title, &item.Stars, &item.Status, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt, &item.TomanPrice)
	return &item, err
}

func (r *postgresRepository) ListWalletTopupPacks(ctx context.Context, activeOnly bool) ([]WalletTopupPack, error) {
	query := queryListWalletTopupPacks
	if activeOnly {
		query = queryListActiveWalletTopupPacks
	}
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListWalletTopupPacks: %w", err)
	}
	defer rows.Close()
	result := []WalletTopupPack{}
	for rows.Next() {
		item, scanErr := scanPack(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		result = append(result, *item)
	}
	return result, rows.Err()
}

func (r *postgresRepository) CreateWalletTopupPack(ctx context.Context, pack WalletTopupPack) (*WalletTopupPack, error) {
	item, err := scanPack(r.db.QueryRow(ctx, queryCreateWalletTopupPack, strings.TrimSpace(pack.Title), pack.Stars, pack.Status, pack.SortOrder, pack.TomanPrice))
	if err != nil {
		return nil, fmt.Errorf("payments.repository.CreateWalletTopupPack: %w", err)
	}
	return item, nil
}
func (r *postgresRepository) UpdateWalletTopupPack(ctx context.Context, pack WalletTopupPack) (*WalletTopupPack, error) {
	item, err := scanPack(r.db.QueryRow(ctx, queryUpdateWalletTopupPack, pack.ID, strings.TrimSpace(pack.Title), pack.Stars, pack.Status, pack.SortOrder, pack.TomanPrice))
	if err != nil {
		return nil, fmt.Errorf("payments.repository.UpdateWalletTopupPack: %w", err)
	}
	return item, nil
}
func (r *postgresRepository) DeleteWalletTopupPack(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, queryDeleteWalletTopupPack, id)
	if err != nil {
		return fmt.Errorf("payments.repository.DeleteWalletTopupPack: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
func (r *postgresRepository) GetActiveWalletTopupPack(ctx context.Context, id string) (*WalletTopupPack, error) {
	item, err := scanPack(r.db.QueryRow(ctx, queryGetActiveWalletTopupPack, id))
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetActiveWalletTopupPack: %w", err)
	}
	return item, nil
}

func scanAdminWallet(row pgx.Row, item *AdminWallet) error {
	return row.Scan(&item.UserID, &item.FirstName, &item.LastName, &item.Username, &item.TelegramID, &item.Balance, &item.HasActivePlan, &item.PlanExpireAt, &item.TransactionCount, &item.PhotoURL, &item.PhoneNumber)
}
func scanWalletTransactions(rows pgx.Rows) ([]WalletTransaction, error) {
	items := []WalletTransaction{}
	for rows.Next() {
		var item WalletTransaction
		if err := rows.Scan(&item.ID, &item.Type, &item.Amount, &item.BalanceBefore, &item.BalanceAfter, &item.Description, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (r *postgresRepository) ListAdminWallets(ctx context.Context, limit, offset int) ([]AdminWallet, error) {
	rows, err := r.db.Query(ctx, queryListAdminWallets, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListAdminWallets: %w", err)
	}
	defer rows.Close()
	items := []AdminWallet{}
	for rows.Next() {
		var item AdminWallet
		if err := scanAdminWallet(rows, &item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (r *postgresRepository) CountUsers(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, queryCountUsers).Scan(&total)
	return total, err
}
func (r *postgresRepository) AdminWalletDetail(ctx context.Context, userID string) (*AdminWalletDetail, error) {
	var result AdminWalletDetail
	if err := scanAdminWallet(r.db.QueryRow(ctx, queryGetAdminWallet, userID), &result.Wallet); err != nil {
		return nil, fmt.Errorf("payments.repository.AdminWalletDetail: %w", err)
	}
	rows, err := r.db.Query(ctx, queryListWalletTransactionsByUserID, userID, 100)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result.Transactions, err = scanWalletTransactions(rows)
	return &result, err
}
func (r *postgresRepository) AdjustWallet(ctx context.Context, userID string, amount int64, description string) (*AdminWalletDetail, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var before int64
	if err := tx.QueryRow(ctx, queryLockWalletBalanceByUserID, userID).Scan(&before); err != nil {
		return nil, err
	}
	after := before + amount
	if after < 0 {
		return nil, ErrWalletWouldBeNegative
	}
	if _, err := tx.Exec(ctx, queryUpdateWalletBalance, userID, after); err != nil {
		return nil, err
	}
	absolute := amount
	if absolute < 0 {
		absolute = -absolute
	}
	if _, err := tx.Exec(ctx, queryInsertAdminWalletAdjustment, userID, absolute, before, after, strings.TrimSpace(description)); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.AdminWalletDetail(ctx, userID)
}

func (r *postgresRepository) GetVIPQuoteData(ctx context.Context, telegramID int64, planID string) (*VIPQuoteData, error) {
	var data VIPQuoteData
	err := r.db.QueryRow(ctx, queryGetVIPQuoteData, planID, telegramID).Scan(&data.PlanTitle, &data.OriginalStars, &data.TargetTier, &data.CurrentPlanID, &data.CurrentExpireAt, &data.CurrentPlanTitle, &data.CurrentPrice, &data.CurrentDuration, &data.CurrentTier)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrCheckoutUnavailable
	}
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetVIPQuoteData: %w", err)
	}
	return &data, nil
}
func (r *postgresRepository) GetVIPPlanDuration(ctx context.Context, planID string) (int, error) {
	var duration int
	err := r.db.QueryRow(ctx, queryGetActiveVIPPlanDuration, planID).Scan(&duration)
	return duration, err
}
func (r *postgresRepository) WalletByTelegramID(ctx context.Context, telegramID int64) (*Wallet, error) {
	var userID string
	var result Wallet
	if err := r.db.QueryRow(ctx, queryGetWalletByTelegramID, telegramID).Scan(&userID, &result.Balance); err != nil {
		return nil, err
	}
	rows, err := r.db.Query(ctx, queryListWalletTransactionsByUserID, userID, 30)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result.Transactions, err = scanWalletTransactions(rows)
	return &result, err
}
func (r *postgresRepository) WalletBalanceByTelegramID(ctx context.Context, telegramID int64) (int64, error) {
	var balance int64
	err := r.db.QueryRow(ctx, queryGetWalletBalanceByTelegramID, telegramID).Scan(&balance)
	return balance, err
}
