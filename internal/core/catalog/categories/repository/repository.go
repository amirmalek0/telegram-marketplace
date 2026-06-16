package repository

import (
	"context"
	"errors"
	"fmt"
	"telegram-marketplace/internal/core/catalog/categories/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested category does not exist.
var ErrNotFound = fmt.Errorf("category not found")

// ErrDuplicate is returned when a category with the same slug already exists.
var ErrDuplicate = fmt.Errorf("duplicate category is not allowed")

// Repository defines the data-access contract for the categories domain.
//
// Methods are grouped by concern:
//   - Writes  : Create, Update, UpdateStorageID, BulkUpdateSortOrder, Delete
//   - Single  : GetByID, GetBySlug
//   - Many    : List, Count
type Repository interface {
	// --- Writes ---
	Create(ctx context.Context, c *model.Category) error
	Update(ctx context.Context, c *model.Category) error
	UpdateStorageID(ctx context.Context, id, storageID string) error
	BulkUpdateSortOrder(ctx context.Context, ids []string, orders []int) error
	Delete(ctx context.Context, id string) error

	// --- Single reads ---
	GetByID(ctx context.Context, id string) (*model.Category, error)
	GetBySlug(ctx context.Context, slug string) (*model.Category, error)

	// --- Collection reads ---
	List(ctx context.Context, limit, offset int) ([]*model.Category, error)
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

func (r *postgresRepository) Create(ctx context.Context, c *model.Category) error {
	err := r.db.QueryRow(ctx, queryCreateCategory,
		c.Title, c.Slug, c.StorageID, c.Active, c.SortOrder, c.CreatedAt,
	).Scan(&c.ID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrDuplicate
		}
		return fmt.Errorf("categories.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) Update(ctx context.Context, c *model.Category) error {
	_, err := r.db.Exec(ctx, queryUpdateCategory,
		c.Title, c.Slug, c.Active, c.SortOrder, c.ID,
	)
	if err != nil {
		return fmt.Errorf("categories.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) UpdateStorageID(ctx context.Context, id, storageID string) error {
	_, err := r.db.Exec(ctx, queryUpdateStorageID, storageID, id)
	if err != nil {
		return fmt.Errorf("categories.repository.UpdateStorageID: %w", err)
	}
	return nil
}

// BulkUpdateSortOrder updates sort_order for multiple categories in a single query.
// ids and orders must have the same length.
func (r *postgresRepository) BulkUpdateSortOrder(ctx context.Context, ids []string, orders []int) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.db.Exec(ctx, queryBulkUpdateSortOrder, ids, orders)
	if err != nil {
		return fmt.Errorf("categories.repository.BulkUpdateSortOrder: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteCategory, id)
	if err != nil {
		return fmt.Errorf("categories.repository.Delete: %w", err)
	}
	return nil
}

// ============================================================
// Single reads
// ============================================================

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.Category, error) {
	rows, err := r.db.Query(ctx, queryGetCategoryByID, id)
	if err != nil {
		return nil, fmt.Errorf("categories.repository.GetByID: %w", err)
	}
	cat, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Category])
	if err != nil {
		return nil, fmt.Errorf("categories.repository.GetByID: %w", ErrNotFound)
	}
	return &cat, nil
}

func (r *postgresRepository) GetBySlug(ctx context.Context, slug string) (*model.Category, error) {
	rows, err := r.db.Query(ctx, queryGetCategoryBySlug, slug)
	if err != nil {
		return nil, fmt.Errorf("categories.repository.GetBySlug: %w", err)
	}
	cat, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Category])
	if err != nil {
		return nil, fmt.Errorf("categories.repository.GetBySlug: %w", ErrNotFound)
	}
	return &cat, nil
}

// ============================================================
// Collection reads
// ============================================================

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.Category, error) {
	rows, err := r.db.Query(ctx, queryListCategories, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("categories.repository.List: %w", err)
	}
	cats, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Category])
	if err != nil {
		return nil, fmt.Errorf("categories.repository.List: %w", err)
	}
	result := make([]*model.Category, len(cats))
	for i := range cats {
		result[i] = &cats[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountCategories).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("categories.repository.Count: %w", err)
	}
	return count, nil
}
