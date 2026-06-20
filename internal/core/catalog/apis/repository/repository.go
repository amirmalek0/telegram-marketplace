package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"telegram-marketplace/internal/core/catalog/apis/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested API does not exist.
var ErrNotFound = fmt.Errorf("api not found")

// Repository defines the data-access contract for the apis domain.
type Repository interface {
	Create(ctx context.Context, api *model.API) error
	GetByID(ctx context.Context, id string) (*model.API, error)
	List(ctx context.Context, limit, offset int) ([]*model.API, error)
	Count(ctx context.Context) (int64, error)
	Update(ctx context.Context, api *model.API) error
	Delete(ctx context.Context, id string) error
	Exists(ctx context.Context, id string) (bool, error)
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

func (r *postgresRepository) Create(ctx context.Context, api *model.API) error {
	headersJSON, err := json.Marshal(api.Headers)
	if err != nil {
		return fmt.Errorf("apis.repository.Create: failed to marshal headers: %w", err)
	}

	err = r.db.QueryRow(ctx, queryCreateAPI,
		api.Name, api.URL, api.Method, api.Body, api.ResponsePath, headersJSON, api.CreatedAt,
	).Scan(&api.ID)
	if err != nil {
		return fmt.Errorf("apis.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.API, error) {
	rows, err := r.db.Query(ctx, queryGetAPIByID, id)
	if err != nil {
		return nil, fmt.Errorf("apis.repository.GetByID: %w", err)
	}
	api, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.API])
	if err != nil {
		return nil, fmt.Errorf("apis.repository.GetByID: %w", ErrNotFound)
	}
	return &api, nil
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.API, error) {
	rows, err := r.db.Query(ctx, queryListAPIs, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("apis.repository.List: %w", err)
	}
	apis, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.API])
	if err != nil {
		return nil, fmt.Errorf("apis.repository.List: %w", err)
	}
	result := make([]*model.API, len(apis))
	for i := range apis {
		result[i] = &apis[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountAPIs).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("apis.repository.Count: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) Update(ctx context.Context, api *model.API) error {
	headersJSON, err := json.Marshal(api.Headers)
	if err != nil {
		return fmt.Errorf("apis.repository.Update: failed to marshal headers: %w", err)
	}

	_, err = r.db.Exec(ctx, queryUpdateAPI,
		api.Name, api.URL, api.Method, api.Body, api.ResponsePath, headersJSON, api.ID,
	)
	if err != nil {
		return fmt.Errorf("apis.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteAPI, id)
	if err != nil {
		return fmt.Errorf("apis.repository.Delete: %w", err)
	}
	return nil
}

func (r *postgresRepository) Exists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, queryAPIExists, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("apis.repository.Exists: %w", err)
	}
	return exists, nil
}
