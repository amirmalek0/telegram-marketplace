package repository

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/catalog/bundles/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested bundle does not exist.
var ErrNotFound = fmt.Errorf("bundle not found")

// Repository defines the data-access contract for the bundles domain.
type Repository interface {
	Create(ctx context.Context, b *model.Bundle) error
	GetByID(ctx context.Context, id string) (*model.Bundle, error)
	List(ctx context.Context, limit, offset int) ([]*model.Bundle, error)
	Count(ctx context.Context) (int64, error)
	Update(ctx context.Context, b *model.Bundle) error
	Delete(ctx context.Context, id string) error
	Exists(ctx context.Context, id string) (bool, error)
	IsFileReferenced(ctx context.Context, fileID string) (bool, error)
	IsMessageReferenced(ctx context.Context, messageID string) (bool, error)
	IsInventoryReferenced(ctx context.Context, inventoryID string) (bool, error)
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

func (r *postgresRepository) Create(ctx context.Context, b *model.Bundle) error {
	err := r.db.QueryRow(ctx, queryCreateBundle,
		b.FileID, b.MessageID, b.InventoryID, b.CreatedAt,
	).Scan(&b.ID)
	if err != nil {
		return fmt.Errorf("bundles.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.Bundle, error) {
	rows, err := r.db.Query(ctx, queryGetBundleByID, id)
	if err != nil {
		return nil, fmt.Errorf("bundles.repository.GetByID: %w", err)
	}
	bundle, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Bundle])
	if err != nil {
		return nil, fmt.Errorf("bundles.repository.GetByID: %w", ErrNotFound)
	}
	return &bundle, nil
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.Bundle, error) {
	rows, err := r.db.Query(ctx, queryListBundles, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("bundles.repository.List: %w", err)
	}
	bundles, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Bundle])
	if err != nil {
		return nil, fmt.Errorf("bundles.repository.List: %w", err)
	}
	result := make([]*model.Bundle, len(bundles))
	for i := range bundles {
		result[i] = &bundles[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountBundles).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("bundles.repository.Count: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) Update(ctx context.Context, b *model.Bundle) error {
	_, err := r.db.Exec(ctx, queryUpdateBundle,
		b.FileID, b.MessageID, b.InventoryID, b.ID,
	)
	if err != nil {
		return fmt.Errorf("bundles.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteBundle, id)
	if err != nil {
		return fmt.Errorf("bundles.repository.Delete: %w", err)
	}
	return nil
}

func (r *postgresRepository) Exists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, queryBundleExists, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("bundles.repository.Exists: %w", err)
	}
	return exists, nil
}

func (r *postgresRepository) IsFileReferenced(ctx context.Context, fileID string) (bool, error) {
	var referenced bool
	err := r.db.QueryRow(ctx, queryIsFileReferenced, fileID).Scan(&referenced)
	if err != nil {
		return false, fmt.Errorf("bundles.repository.IsFileReferenced: %w", err)
	}
	return referenced, nil
}

func (r *postgresRepository) IsMessageReferenced(ctx context.Context, messageID string) (bool, error) {
	var referenced bool
	err := r.db.QueryRow(ctx, queryIsMessageReferenced, messageID).Scan(&referenced)
	if err != nil {
		return false, fmt.Errorf("bundles.repository.IsMessageReferenced: %w", err)
	}
	return referenced, nil
}

func (r *postgresRepository) IsInventoryReferenced(ctx context.Context, inventoryID string) (bool, error) {
	var referenced bool
	err := r.db.QueryRow(ctx, queryIsInventoryReferenced, inventoryID).Scan(&referenced)
	if err != nil {
		return false, fmt.Errorf("bundles.repository.IsInventoryReferenced: %w", err)
	}
	return referenced, nil
}
