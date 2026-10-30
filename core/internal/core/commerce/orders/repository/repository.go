package repository

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/commerce/orders/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested order does not exist.
var ErrNotFound = fmt.Errorf("order not found")

// Repository defines the data-access contract for the orders domain.
type Repository interface {
	GetByID(ctx context.Context, id string) (*model.Order, error)
	ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*model.Order, error)
	CountByUserID(ctx context.Context, userID string) (int64, error)
	ListAll(ctx context.Context, limit, offset int) ([]*model.AdminOrder, error)
	Summary(context.Context) (model.Summary, error)
	CountAll(ctx context.Context) (int64, error)
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

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.Order, error) {
	rows, err := r.db.Query(ctx, queryGetOrderByID, id)
	if err != nil {
		return nil, fmt.Errorf("orders.repository.GetByID: %w", err)
	}

	order, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Order])
	if err != nil {
		return nil, fmt.Errorf("orders.repository.GetByID: %w", ErrNotFound)
	}
	return &order, nil
}

func (r *postgresRepository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*model.Order, error) {
	rows, err := r.db.Query(ctx, queryListOrdersByUserID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("orders.repository.ListByUserID: %w", err)
	}

	orders, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Order])
	if err != nil {
		return nil, fmt.Errorf("orders.repository.ListByUserID: %w", err)
	}

	result := make([]*model.Order, len(orders))
	for i := range orders {
		result[i] = &orders[i]
	}
	return result, nil
}

func (r *postgresRepository) CountByUserID(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountOrdersByUserID, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("orders.repository.CountByUserID: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) ListAll(ctx context.Context, limit, offset int) ([]*model.AdminOrder, error) {
	rows, err := r.db.Query(ctx, queryListAllOrders, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("orders.repository.ListAll: %w", err)
	}

	orders, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.AdminOrder])
	if err != nil {
		return nil, fmt.Errorf("orders.repository.ListAll: %w", err)
	}

	result := make([]*model.AdminOrder, len(orders))
	for i := range orders {
		result[i] = &orders[i]
	}
	return result, nil
}

func (r *postgresRepository) CountAll(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountAllOrders).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("orders.repository.CountAll: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) Summary(ctx context.Context) (model.Summary, error) {
	var summary model.Summary
	err := r.db.QueryRow(ctx, queryOrdersSummary).Scan(&summary.Total, &summary.Pending, &summary.Paid, &summary.PaidStars, &summary.PaidToman)
	return summary, err
}
