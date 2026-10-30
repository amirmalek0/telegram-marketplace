package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"telegram-marketplace/internal/core/settings/model"
)

// DeleteLinkedContent updates referencing pages and removes their definition in
// the same transaction, using the lock shared by all layout/definition writes.
func (r *postgresRepository) DeleteLinkedContent(ctx context.Context, key, adminID string, prepare func([]model.ContentEntry) ([]model.ContentEntry, error)) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, queryLockContentGraph); err != nil {
		return err
	}
	rows, err := tx.Query(ctx, queryListContent)
	if err != nil {
		return err
	}
	entries, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.ContentEntry])
	if err != nil {
		return err
	}
	updates, err := prepare(entries)
	if err != nil {
		return err
	}
	for _, entry := range updates {
		if _, err = tx.Exec(ctx, queryUpsertContent, entry.Key, entry.Value, adminID); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, queryDeleteContent, key); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
