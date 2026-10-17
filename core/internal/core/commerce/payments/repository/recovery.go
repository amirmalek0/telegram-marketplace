package repository

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
)

func (r *postgresRepository) PendingAPIDeliveries(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx, queryPendingDeliveries)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[string])
}

func (r *postgresRepository) RecordRefund(ctx context.Context, reference, charge string, telegramID int64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, queryLockCheckoutLifecycle); err != nil {
		return err
	}
	var orderID *string
	err = tx.QueryRow(ctx, queryRecordRefund, reference, charge, telegramID).Scan(&orderID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if orderID != nil {
		for _, q := range []string{queryFailOrder, queryCancelFailedOrder, queryReleaseInventoryByOrder} {
			if _, err = tx.Exec(ctx, q, *orderID); err != nil {
				return err
			}
		}
		if _, err = tx.Exec(ctx, queryFailDeliveryByOrder, *orderID, "پرداخت بازگردانده شد."); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, queryCompleteRefund, charge, telegramID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *postgresRepository) PrepareRefund(ctx context.Context, reference, charge string, telegramID int64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, queryLockCheckoutLifecycle); err != nil {
		return err
	}
	var paid bool
	if err = tx.QueryRow(ctx, queryRefundAlreadySettled, charge).Scan(&paid); err != nil {
		return err
	}
	if paid {
		return ErrInvalidTransition
	}
	if _, err = tx.Exec(ctx, queryPrepareRefund, charge, reference, telegramID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
