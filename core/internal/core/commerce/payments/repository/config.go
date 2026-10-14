package repository

import (
	"context"
	"fmt"
	"time"
)

type PaymentConfig struct {
	TestMode  bool
	UpdatedAt time.Time
}

func (r *postgresRepository) GetPaymentConfig(ctx context.Context, settingsID string) (*PaymentConfig, error) {
	var result PaymentConfig
	if err := r.db.QueryRow(ctx, queryGetPaymentConfig, settingsID).Scan(&result.TestMode, &result.UpdatedAt); err != nil {
		return nil, fmt.Errorf("payments.repository.GetPaymentConfig: %w", err)
	}
	return &result, nil
}

func (r *postgresRepository) UpdatePaymentConfig(ctx context.Context, settingsID string, testMode bool) (*PaymentConfig, error) {
	var result PaymentConfig
	if err := r.db.QueryRow(ctx, queryUpdatePaymentConfig, settingsID, testMode).Scan(&result.TestMode, &result.UpdatedAt); err != nil {
		return nil, fmt.Errorf("payments.repository.UpdatePaymentConfig: %w", err)
	}
	return &result, nil
}
