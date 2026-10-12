package payments

import (
	"context"
	"fmt"
)

const paymentSettingsID = "00000000-0000-0000-0000-000000000001"

// GetPaymentConfig returns the global checkout mode controlled by an admin.
// The setting determines how new checkouts are created; each payment keeps its
// own is_test flag so changing the mode cannot reinterpret an existing payment.
func (s *Service) GetPaymentConfig(ctx context.Context) (*PaymentConfigResponse, error) {
	var result PaymentConfigResponse
	err := s.db.QueryRow(ctx, `
		SELECT payment_test_mode, updated_at
		FROM settings WHERE id = $1`, paymentSettingsID,
	).Scan(&result.TestMode, &result.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("payments get config: %w", err)
	}
	return &result, nil
}

// UpdatePaymentConfig switches future checkouts between application test mode
// and real Telegram Stars invoices.
func (s *Service) UpdatePaymentConfig(ctx context.Context, testMode bool) (*PaymentConfigResponse, error) {
	var result PaymentConfigResponse
	err := s.db.QueryRow(ctx, `
		UPDATE settings
		SET payment_test_mode = $2, updated_at = now()
		WHERE id = $1
		RETURNING payment_test_mode, updated_at`, paymentSettingsID, testMode,
	).Scan(&result.TestMode, &result.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("payments update config: %w", err)
	}
	return &result, nil
}
