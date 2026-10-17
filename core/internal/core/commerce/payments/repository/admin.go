package repository

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"telegram-marketplace/internal/core/commerce/payments/model"
)

func (r *postgresRepository) ListAdminByMethod(ctx context.Context, method model.PaymentMethod, limit, offset int) ([]model.AdminPayment, error) {
	rows, err := r.db.Query(ctx, queryListAdminPayments, method, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListAdminByMethod: %w", err)
	}
	result, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.AdminPayment])
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListAdminByMethod: %w", err)
	}
	return result, nil
}

func (r *postgresRepository) AdminSummary(ctx context.Context, method model.PaymentMethod) (*model.Summary, error) {
	var result model.Summary
	err := r.db.QueryRow(ctx, queryAdminPaymentsSummary, method).Scan(&result.Total, &result.Succeeded, &result.Pending, &result.Failed, &result.Refunded, &result.TestTotal, &result.PaidStars)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.AdminSummary: %w", err)
	}
	return &result, nil
}
