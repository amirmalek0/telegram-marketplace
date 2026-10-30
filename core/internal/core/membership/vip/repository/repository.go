package repository

import (
	"context"
	"errors"
	"fmt"

	"telegram-marketplace/internal/core/membership/vip/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested VIP plan does not exist.
var ErrNotFound = fmt.Errorf("vip plan not found")

// Repository defines the data-access contract for the vip_plans domain.
type Repository interface {
	// --- Writes ---
	Create(ctx context.Context, p *model.Plan) error
	Update(ctx context.Context, p *model.Plan) error
	Delete(ctx context.Context, id string) error

	// --- Single reads ---
	GetByID(ctx context.Context, id string) (*model.Plan, error)

	// --- Collection reads ---
	List(ctx context.Context, limit, offset int) ([]*model.Plan, error)
	Count(ctx context.Context) (int64, error)
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

// ============================================================
// Writes
// ============================================================

func (r *postgresRepository) Create(ctx context.Context, p *model.Plan) error {
	err := r.db.QueryRow(ctx, queryCreatePlan,
		p.Title, p.StarsPrice, p.Duration, p.Tier, p.Status, p.CreatedAt, p.TomanPrice,
	).Scan(&p.ID)
	if err != nil {
		return fmt.Errorf("vip.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) Update(ctx context.Context, p *model.Plan) error {
	_, err := r.db.Exec(ctx, queryUpdatePlan,
		p.Title, p.StarsPrice, p.Duration, p.Tier, p.Status, p.ID, p.TomanPrice,
	)
	if err != nil {
		return fmt.Errorf("vip.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, queryDeletePlan, id)
	if err != nil {
		return fmt.Errorf("vip.repository.Delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ============================================================
// Single reads
// ============================================================

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.Plan, error) {
	rows, err := r.db.Query(ctx, queryGetPlanByID, id)
	if err != nil {
		return nil, fmt.Errorf("vip.repository.GetByID: %w", err)
	}

	p, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Plan])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("vip.repository.GetByID: %w", err)
	}
	return &p, nil
}

// ============================================================
// Collection reads
// ============================================================

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.Plan, error) {
	rows, err := r.db.Query(ctx, queryListPlans, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("vip.repository.List: %w", err)
	}

	plans, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Plan])
	if err != nil {
		return nil, fmt.Errorf("vip.repository.List: %w", err)
	}

	result := make([]*model.Plan, len(plans))
	for i := range plans {
		result[i] = &plans[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, queryCountPlans).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("vip.repository.Count: %w", err)
	}
	return total, nil
}
