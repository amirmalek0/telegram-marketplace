package repository

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/commerce/coupons/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested coupon does not exist.
var ErrNotFound = fmt.Errorf("coupon not found")

// ErrCodeExists is returned when a coupon with the same code already exists.
var ErrCodeExists = fmt.Errorf("coupon code already exists")

// Repository defines the data-access contract for the coupons domain.
type Repository interface {
	Create(ctx context.Context, c *model.Coupon) error
	GetByID(ctx context.Context, id string) (*model.Coupon, error)
	GetByCode(ctx context.Context, code string) (*model.Coupon, error)
	List(ctx context.Context, limit, offset int) ([]*model.Coupon, error)
	Count(ctx context.Context) (int64, error)
	Update(ctx context.Context, c *model.Coupon) error
	Delete(ctx context.Context, id string) error
	IncrementUsage(ctx context.Context, id string) error
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

func (r *postgresRepository) Create(ctx context.Context, c *model.Coupon) error {
	err := r.db.QueryRow(ctx, queryCreateCoupon,
		c.Code, c.DiscountType, c.DiscountValue, c.UsageLimit, c.UsageCount, c.ExpiresAt, c.IsActive, c.ProductIDs, c.CreatedAt, c.UpdatedAt,
	).Scan(&c.ID)
	if err != nil {
		return fmt.Errorf("coupons.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.Coupon, error) {
	rows, err := r.db.Query(ctx, queryGetCouponByID, id)
	if err != nil {
		return nil, fmt.Errorf("coupons.repository.GetByID: %w", err)
	}

	coupon, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Coupon])
	if err != nil {
		return nil, fmt.Errorf("coupons.repository.GetByID: %w", ErrNotFound)
	}
	return &coupon, nil
}

func (r *postgresRepository) GetByCode(ctx context.Context, code string) (*model.Coupon, error) {
	rows, err := r.db.Query(ctx, queryGetCouponByCode, code)
	if err != nil {
		return nil, fmt.Errorf("coupons.repository.GetByCode: %w", err)
	}

	coupon, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Coupon])
	if err != nil {
		return nil, fmt.Errorf("coupons.repository.GetByCode: %w", ErrNotFound)
	}
	return &coupon, nil
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.Coupon, error) {
	rows, err := r.db.Query(ctx, queryListCoupons, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("coupons.repository.List: %w", err)
	}

	coupons, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Coupon])
	if err != nil {
		return nil, fmt.Errorf("coupons.repository.List: %w", err)
	}

	result := make([]*model.Coupon, len(coupons))
	for i := range coupons {
		result[i] = &coupons[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountCoupons).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("coupons.repository.Count: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) Update(ctx context.Context, c *model.Coupon) error {
	_, err := r.db.Exec(ctx, queryUpdateCoupon,
		c.Code, c.DiscountType, c.DiscountValue, c.UsageLimit, c.ExpiresAt, c.IsActive, c.ProductIDs, c.UpdatedAt, c.ID,
	)
	if err != nil {
		return fmt.Errorf("coupons.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteCoupon, id)
	if err != nil {
		return fmt.Errorf("coupons.repository.Delete: %w", err)
	}
	return nil
}

func (r *postgresRepository) IncrementUsage(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryIncrementUsage, id)
	if err != nil {
		return fmt.Errorf("coupons.repository.IncrementUsage: %w", err)
	}
	return nil
}
