package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/membership/admins/model"
)

// ErrNotFound is returned when a requested admin does not exist.
var ErrNotFound = fmt.Errorf("admin not found")

// Repository defines the data-access contract for the admins domain.
type Repository interface {
	Create(ctx context.Context, a *model.Admin) error
	FindByUsername(ctx context.Context, username string) (*model.Admin, error)
	FindByID(ctx context.Context, id string) (*model.Admin, error)
	UpdateLastLogin(ctx context.Context, id string) error
	Update(ctx context.Context, id string, updates map[string]interface{}) error
	List(ctx context.Context, limit, offset int) ([]model.Admin, error)
	Delete(ctx context.Context, id string) error
}

// postgresRepository is the Postgres implementation of Repository.
type postgresRepository struct {
	db *pgxpool.Pool
}

// NewPostgresRepository creates a new PostgreSQL-backed admin repository.
func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

// compile-time interface check
var _ Repository = (*postgresRepository)(nil)

func (r *postgresRepository) Create(ctx context.Context, a *model.Admin) error {
	now := time.Now()
	a.CreatedAt = now
	a.UpdatedAt = now
	_, err := r.db.Exec(ctx, queryCreateAdmin,
		a.ID, a.Username, a.PasswordHash, a.IsActive, a.CreatedAt, a.UpdatedAt,
	)
	return err
}

func (r *postgresRepository) FindByUsername(ctx context.Context, username string) (*model.Admin, error) {
	var a model.Admin
	err := r.db.QueryRow(ctx, queryFindByUsername, username).Scan(
		&a.ID, &a.Username, &a.PasswordHash, &a.IsActive,
		&a.LastLoginAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *postgresRepository) FindByID(ctx context.Context, id string) (*model.Admin, error) {
	var a model.Admin
	err := r.db.QueryRow(ctx, queryFindByID, id).Scan(
		&a.ID, &a.Username, &a.PasswordHash, &a.IsActive,
		&a.LastLoginAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *postgresRepository) UpdateLastLogin(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryUpdateLastLogin, time.Now(), id)
	return err
}

func (r *postgresRepository) Update(ctx context.Context, id string, updates map[string]interface{}) error {
	// Build dynamic UPDATE query
	query := "UPDATE admins SET updated_at = NOW()"
	args := []interface{}{}
	argIdx := 1

	for key, value := range updates {
		query += ", " + key + " = $" + string(rune('0'+argIdx))
		args = append(args, value)
		argIdx++
	}

	query += " WHERE id = $" + string(rune('0'+argIdx))
	args = append(args, id)

	_, err := r.db.Exec(ctx, query, args...)
	return err
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]model.Admin, error) {
	rows, err := r.db.Query(ctx, queryListAdmins, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var admins []model.Admin
	for rows.Next() {
		var a model.Admin
		if err := rows.Scan(
			&a.ID, &a.Username, &a.PasswordHash, &a.IsActive,
			&a.LastLoginAt, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}
		admins = append(admins, a)
	}
	return admins, rows.Err()
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteAdmin, id)
	return err
}
