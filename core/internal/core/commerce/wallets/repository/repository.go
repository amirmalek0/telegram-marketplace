package repository

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/commerce/wallets/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested wallet transaction does not exist.
var ErrNotFound = fmt.Errorf("wallet transaction not found")

// Repository defines the data-access contract for the wallet transactions domain.
type Repository interface {
	// Create inserts a new wallet transaction record.
	Create(ctx context.Context, tx *model.WalletTransaction) error

	// GetByID retrieves a wallet transaction by its UUID.
	GetByID(ctx context.Context, id string) (*model.WalletTransaction, error)

	// ListByUserID retrieves a paginated list of transactions for a user.
	ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*model.WalletTransaction, error)

	// CountByUserID returns the total number of transactions for a user.
	CountByUserID(ctx context.Context, userID string) (int64, error)
}

// postgresRepository is the Postgres implementation of Repository.
type postgresRepository struct {
	db *pgxpool.Pool
}

// NewPostgresRepository constructs a Postgres-backed Repository.
func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

// compile-time interface check
var _ Repository = (*postgresRepository)(nil)

func (r *postgresRepository) Create(ctx context.Context, tx *model.WalletTransaction) error {
	err := r.db.QueryRow(ctx, queryCreateTransaction,
		tx.UserID, tx.Type, tx.Amount, tx.BalanceBefore, tx.BalanceAfter, tx.Description, tx.CreatedAt,
	).Scan(&tx.ID)
	if err != nil {
		return fmt.Errorf("wallets.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.WalletTransaction, error) {
	rows, err := r.db.Query(ctx, queryGetTransactionByID, id)
	if err != nil {
		return nil, fmt.Errorf("wallets.repository.GetByID: %w", err)
	}

	tx, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.WalletTransaction])
	if err != nil {
		return nil, fmt.Errorf("wallets.repository.GetByID: %w", err)
	}
	return &tx, nil
}

func (r *postgresRepository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*model.WalletTransaction, error) {
	rows, err := r.db.Query(ctx, queryListTransactionsByUserID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("wallets.repository.ListByUserID: %w", err)
	}

	transactions, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.WalletTransaction])
	if err != nil {
		return nil, fmt.Errorf("wallets.repository.ListByUserID: %w", err)
	}

	// Convert []WalletTransaction to []*WalletTransaction
	result := make([]*model.WalletTransaction, len(transactions))
	for i := range transactions {
		result[i] = &transactions[i]
	}
	return result, nil
}

func (r *postgresRepository) CountByUserID(ctx context.Context, userID string) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, queryCountTransactionsByUserID, userID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("wallets.repository.CountByUserID: %w", err)
	}
	return total, nil
}
