package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"telegram-marketplace/internal/core/settings/model"
)

func (r *postgresRepository) MutateContent(ctx context.Context, key string, value *string, adminID string, validate func([]model.ContentEntry) error) (*model.ContentEntry, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	// Serialize definition/page changes, including deletes, to prevent dangling
	// references or incompatible concurrent changes between validation and write.
	if _, err = tx.Exec(ctx, queryLockContentGraph); err != nil {
		return nil, err
	}
	rows, err := tx.Query(ctx, queryListContent)
	if err != nil {
		return nil, err
	}
	entries, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.ContentEntry])
	if err != nil {
		return nil, err
	}
	if err = validate(entries); err != nil {
		return nil, err
	}
	var entry *model.ContentEntry
	if value == nil {
		_, err = tx.Exec(ctx, queryDeleteContent, key)
	} else {
		entry = &model.ContentEntry{}
		err = tx.QueryRow(ctx, queryUpsertContent, key, *value, adminID).Scan(&entry.Key, &entry.Value, &entry.UpdatedAt)
	}
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	return entry, nil
}
