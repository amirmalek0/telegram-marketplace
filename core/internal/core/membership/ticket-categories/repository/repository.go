package repository

import (
	"context"
	"errors"
	"fmt"
	"telegram-marketplace/internal/core/membership/ticket-categories/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested ticket category does not exist.
var ErrNotFound = fmt.Errorf("ticket category not found")

// ErrDuplicate is returned when a duplicate ticket category constraint is violated.
var ErrDuplicate = fmt.Errorf("duplicate ticket category is not allowed")

// ErrInUse is returned when attempting to delete a category that is still in use by tickets.
var ErrInUse = fmt.Errorf("ticket category is in use and cannot be deleted")

// Repository defines the data-access contract for the ticket_categories domain.
type Repository interface {
	// --- Writes ---
	Create(ctx context.Context, c *model.TicketCategory) error
	Update(ctx context.Context, c *model.TicketCategory) error
	Delete(ctx context.Context, id string) error

	// --- Single reads ---
	GetByID(ctx context.Context, id string) (*model.TicketCategory, error)
	GetByName(ctx context.Context, name string) (*model.TicketCategory, error)

	// --- Collection reads ---
	List(ctx context.Context, limit, offset int) ([]*model.TicketCategory, error)
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

func (r *postgresRepository) Create(ctx context.Context, c *model.TicketCategory) error {
	err := r.db.QueryRow(ctx, queryCreateTicketCategory,
		c.Name, c.CreatedAt,
	).Scan(&c.ID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrDuplicate
		}
		return fmt.Errorf("ticket_categories.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) Update(ctx context.Context, c *model.TicketCategory) error {
	_, err := r.db.Exec(ctx, queryUpdateTicketCategory,
		c.Name, c.ID,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrDuplicate
		}
		return fmt.Errorf("ticket_categories.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteTicketCategory, id)
	if err != nil {
		var pgErr *pgconn.PgError
		// Foreign key violation (23503) means category is in use
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return ErrInUse
		}
		return fmt.Errorf("ticket_categories.repository.Delete: %w", err)
	}
	return nil
}

// ============================================================
// Single reads
// ============================================================

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.TicketCategory, error) {
	rows, err := r.db.Query(ctx, queryGetTicketCategoryByID, id)
	if err != nil {
		return nil, fmt.Errorf("ticket_categories.repository.GetByID: %w", err)
	}

	c, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.TicketCategory])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("ticket_categories.repository.GetByID: %w", err)
	}
	return &c, nil
}

func (r *postgresRepository) GetByName(ctx context.Context, name string) (*model.TicketCategory, error) {
	rows, err := r.db.Query(ctx, queryGetTicketCategoryByName, name)
	if err != nil {
		return nil, fmt.Errorf("ticket_categories.repository.GetByName: %w", err)
	}

	c, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.TicketCategory])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("ticket_categories.repository.GetByName: %w", err)
	}
	return &c, nil
}

// ============================================================
// Collection reads
// ============================================================

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.TicketCategory, error) {
	rows, err := r.db.Query(ctx, queryListTicketCategories, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("ticket_categories.repository.List: %w", err)
	}

	categories, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.TicketCategory])
	if err != nil {
		return nil, fmt.Errorf("ticket_categories.repository.List: %w", err)
	}

	result := make([]*model.TicketCategory, len(categories))
	for i := range categories {
		result[i] = &categories[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, queryCountTicketCategories).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("ticket_categories.repository.Count: %w", err)
	}
	return total, nil
}
