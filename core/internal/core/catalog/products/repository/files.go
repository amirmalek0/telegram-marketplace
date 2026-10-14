package repository

import (
	"context"
	"github.com/jackc/pgx/v5"
	"telegram-marketplace/internal/core/catalog/products/model"
)

func replaceProductFiles(ctx context.Context, tx pgx.Tx, p *model.Product) error {
	if _, err := tx.Exec(ctx, queryDeleteProductFiles, p.ID); err != nil {
		return err
	}
	if p.DeliveryType != model.DeliveryTypeFile {
		return nil
	}
	ids := p.FileIDs
	if len(ids) == 0 && p.FileID != nil {
		ids = []string{*p.FileID}
	}
	for position, id := range ids {
		if _, err := tx.Exec(ctx, queryInsertProductFile, p.ID, id, position); err != nil {
			return err
		}
	}
	return nil
}
