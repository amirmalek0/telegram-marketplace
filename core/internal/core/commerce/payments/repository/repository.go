package repository

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/commerce/payments/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested payment does not exist.
var ErrNotFound = fmt.Errorf("payment not found")

// Repository defines the data-access contract for the payments domain.
type Repository interface {
	Create(ctx context.Context, p *model.Payment) error
	GetByID(ctx context.Context, id string) (*model.Payment, error)
	GetByGatewayTrxID(ctx context.Context, gatewayTrxID, provider string) (*model.Payment, error)
	ListByOrderID(ctx context.Context, orderID string) ([]*model.Payment, error)
	ListAll(ctx context.Context, limit, offset int) ([]*model.Payment, error)
	CountAll(ctx context.Context) (int64, error)
	UpdateStatus(ctx context.Context, id string, status model.PaymentStatus, gatewayTrxID *string, callbackData []byte) error
	UpdateCallbackData(ctx context.Context, id string, callbackData []byte) error
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

func (r *postgresRepository) Create(ctx context.Context, p *model.Payment) error {
	err := r.db.QueryRow(ctx, queryCreatePayment,
		p.OrderID, p.Provider, p.GatewayTrxID, p.Amount, p.Status, p.CallbackData, p.CreatedAt, p.UpdatedAt,
	).Scan(&p.ID)
	if err != nil {
		return fmt.Errorf("payments.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.Payment, error) {
	rows, err := r.db.Query(ctx, queryGetPaymentByID, id)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetByID: %w", err)
	}

	payment, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Payment])
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetByID: %w", ErrNotFound)
	}
	return &payment, nil
}

func (r *postgresRepository) GetByGatewayTrxID(ctx context.Context, gatewayTrxID, provider string) (*model.Payment, error) {
	rows, err := r.db.Query(ctx, queryGetPaymentByGatewayTrxID, gatewayTrxID, provider)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetByGatewayTrxID: %w", err)
	}

	payment, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Payment])
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetByGatewayTrxID: %w", ErrNotFound)
	}
	return &payment, nil
}

func (r *postgresRepository) ListByOrderID(ctx context.Context, orderID string) ([]*model.Payment, error) {
	rows, err := r.db.Query(ctx, queryListPaymentsByOrderID, orderID)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListByOrderID: %w", err)
	}

	payments, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Payment])
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListByOrderID: %w", err)
	}

	result := make([]*model.Payment, len(payments))
	for i := range payments {
		result[i] = &payments[i]
	}
	return result, nil
}

func (r *postgresRepository) ListAll(ctx context.Context, limit, offset int) ([]*model.Payment, error) {
	rows, err := r.db.Query(ctx, queryListAllPayments, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListAll: %w", err)
	}

	payments, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Payment])
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListAll: %w", err)
	}

	result := make([]*model.Payment, len(payments))
	for i := range payments {
		result[i] = &payments[i]
	}
	return result, nil
}

func (r *postgresRepository) CountAll(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountAllPayments).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("payments.repository.CountAll: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) UpdateStatus(ctx context.Context, id string, status model.PaymentStatus, gatewayTrxID *string, callbackData []byte) error {
	_, err := r.db.Exec(ctx, queryUpdatePaymentStatus, status, gatewayTrxID, callbackData, id)
	if err != nil {
		return fmt.Errorf("payments.repository.UpdateStatus: %w", err)
	}
	return nil
}

func (r *postgresRepository) UpdateCallbackData(ctx context.Context, id string, callbackData []byte) error {
	_, err := r.db.Exec(ctx, queryUpdatePaymentCallbackData, callbackData, id)
	if err != nil {
		return fmt.Errorf("payments.repository.UpdateCallbackData: %w", err)
	}
	return nil
}
