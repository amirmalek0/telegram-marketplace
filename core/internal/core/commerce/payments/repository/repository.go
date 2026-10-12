package repository

import (
	"context"
	"errors"
	"fmt"
	"telegram-marketplace/internal/core/commerce/payments/model"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested payment does not exist.
var ErrNotFound = fmt.Errorf("payment not found")

// ErrInvalidTransition is returned when an idempotent payment state change no
// longer applies to the current record.
var ErrInvalidTransition = errors.New("payment state transition is not allowed")

// Repository defines the data-access contract for the payments domain.
type Repository interface {
	Create(ctx context.Context, p *model.Payment) error
	GetByID(ctx context.Context, id string) (*model.Payment, error)
	GetByCheckoutReference(ctx context.Context, reference string) (*model.Payment, error)
	GetByExternalTransactionID(ctx context.Context, method model.PaymentMethod, transactionID string) (*model.Payment, error)
	ListByOrderID(ctx context.Context, orderID string) ([]*model.Payment, error)
	ListByMethod(ctx context.Context, method model.PaymentMethod, limit, offset int) ([]*model.Payment, error)
	CountByMethod(ctx context.Context, method model.PaymentMethod) (int64, error)
	MarkSucceeded(ctx context.Context, id, externalTransactionID, providerTransactionID string, providerData []byte, paidAt time.Time) error
	MarkRefunded(ctx context.Context, id string, refundedAt time.Time) error
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
		p.OrderID, p.UserID, p.Purpose, p.TargetID, p.Method, p.Currency, p.AmountMinor,
		p.CheckoutReference, p.IsTest, p.Status, p.CreatedAt, p.UpdatedAt,
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

func (r *postgresRepository) GetByCheckoutReference(ctx context.Context, reference string) (*model.Payment, error) {
	rows, err := r.db.Query(ctx, queryGetPaymentByCheckoutReference, reference)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetByCheckoutReference: %w", err)
	}

	payment, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Payment])
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetByCheckoutReference: %w", ErrNotFound)
	}
	return &payment, nil
}

func (r *postgresRepository) GetByExternalTransactionID(ctx context.Context, method model.PaymentMethod, transactionID string) (*model.Payment, error) {
	rows, err := r.db.Query(ctx, queryGetPaymentByExternalTransactionID, method, transactionID)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetByExternalTransactionID: %w", err)
	}

	payment, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Payment])
	if err != nil {
		return nil, fmt.Errorf("payments.repository.GetByExternalTransactionID: %w", ErrNotFound)
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

func (r *postgresRepository) ListByMethod(ctx context.Context, method model.PaymentMethod, limit, offset int) ([]*model.Payment, error) {
	rows, err := r.db.Query(ctx, queryListPaymentsByMethod, method, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListByMethod: %w", err)
	}

	payments, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Payment])
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListByMethod: %w", err)
	}

	result := make([]*model.Payment, len(payments))
	for i := range payments {
		result[i] = &payments[i]
	}
	return result, nil
}

func (r *postgresRepository) CountByMethod(ctx context.Context, method model.PaymentMethod) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountPaymentsByMethod, method).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("payments.repository.CountByMethod: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) MarkSucceeded(ctx context.Context, id, externalTransactionID, providerTransactionID string, providerData []byte, paidAt time.Time) error {
	tag, err := r.db.Exec(ctx, queryMarkPaymentSucceeded, externalTransactionID, providerTransactionID, providerData, paidAt, id)
	if err != nil {
		return fmt.Errorf("payments.repository.MarkSucceeded: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return ErrInvalidTransition
	}
	return nil
}

func (r *postgresRepository) MarkRefunded(ctx context.Context, id string, refundedAt time.Time) error {
	tag, err := r.db.Exec(ctx, queryMarkPaymentRefunded, refundedAt, id)
	if err != nil {
		return fmt.Errorf("payments.repository.MarkRefunded: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return ErrInvalidTransition
	}
	return nil
}
