package repository

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/catalog/messages/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested message does not exist.
var ErrNotFound = fmt.Errorf("message not found")

// Repository defines the data-access contract for the messages domain.
type Repository interface {
	Create(ctx context.Context, m *model.DeliveryMessage) error
	GetByID(ctx context.Context, id string) (*model.DeliveryMessage, error)
	List(ctx context.Context, limit, offset int) ([]*model.DeliveryMessage, error)
	Count(ctx context.Context) (int64, error)
	Update(ctx context.Context, m *model.DeliveryMessage) error
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

func (r *postgresRepository) Create(ctx context.Context, m *model.DeliveryMessage) error {
	err := r.db.QueryRow(ctx, queryCreateMessage,
		m.Name, m.Content, m.CreatedAt,
	).Scan(&m.ID)
	if err != nil {
		return fmt.Errorf("messages.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.DeliveryMessage, error) {
	rows, err := r.db.Query(ctx, queryGetMessageByID, id)
	if err != nil {
		return nil, fmt.Errorf("messages.repository.GetByID: %w", err)
	}
	msg, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.DeliveryMessage])
	if err != nil {
		return nil, fmt.Errorf("messages.repository.GetByID: %w", ErrNotFound)
	}
	return &msg, nil
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.DeliveryMessage, error) {
	rows, err := r.db.Query(ctx, queryListMessages, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("messages.repository.List: %w", err)
	}
	msgs, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.DeliveryMessage])
	if err != nil {
		return nil, fmt.Errorf("messages.repository.List: %w", err)
	}
	result := make([]*model.DeliveryMessage, len(msgs))
	for i := range msgs {
		result[i] = &msgs[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountMessages).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("messages.repository.Count: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) Update(ctx context.Context, m *model.DeliveryMessage) error {
	_, err := r.db.Exec(ctx, queryUpdateMessage, m.Name, m.Content, m.ID)
	if err != nil {
		return fmt.Errorf("messages.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteMessage, id)
	if err != nil {
		return fmt.Errorf("messages.repository.Delete: %w", err)
	}
	return nil
}

func (r *postgresRepository) Exists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, queryMessageExists, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("messages.repository.Exists: %w", err)
	}
	return exists, nil
}
