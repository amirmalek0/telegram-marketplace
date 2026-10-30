package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/settings/model"
)

type Repository interface {
	PhoneVerificationRequired(ctx context.Context) (bool, error)
	SetPhoneVerificationRequired(ctx context.Context, required bool) error
	ListContent(ctx context.Context) ([]model.ContentEntry, error)
	UpsertContent(ctx context.Context, key, value, adminID string) (*model.ContentEntry, error)
	DeleteContent(ctx context.Context, key string) error
	DeleteLinkedContent(ctx context.Context, key, adminID string, prepare func([]model.ContentEntry) ([]model.ContentEntry, error)) error
	MutateContent(ctx context.Context, key string, value *string, adminID string, validate func([]model.ContentEntry) error) (*model.ContentEntry, error)
}

type postgresRepository struct{ db *pgxpool.Pool }

func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

var _ Repository = (*postgresRepository)(nil)

func (r *postgresRepository) ListContent(ctx context.Context) ([]model.ContentEntry, error) {
	rows, err := r.db.Query(ctx, queryListContent)
	if err != nil {
		return nil, fmt.Errorf("settings.repository.ListContent: %w", err)
	}
	entries, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.ContentEntry])
	if err != nil {
		return nil, fmt.Errorf("settings.repository.ListContent collect: %w", err)
	}
	return entries, nil
}

func (r *postgresRepository) UpsertContent(ctx context.Context, key, value, adminID string) (*model.ContentEntry, error) {
	entry := &model.ContentEntry{}
	err := r.db.QueryRow(ctx, queryUpsertContent, key, value, adminID).Scan(&entry.Key, &entry.Value, &entry.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("settings.repository.UpsertContent: %w", err)
	}
	return entry, nil
}

func (r *postgresRepository) DeleteContent(ctx context.Context, key string) error {
	if _, err := r.db.Exec(ctx, queryDeleteContent, key); err != nil {
		return fmt.Errorf("settings.repository.DeleteContent: %w", err)
	}
	return nil
}
