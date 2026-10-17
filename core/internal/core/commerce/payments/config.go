package payments

import (
	"context"
)

const paymentSettingsID = "00000000-0000-0000-0000-000000000001"

// GetPaymentConfig returns the global checkout mode controlled by an admin.
// The setting determines how new checkouts are created; each payment keeps its
// own is_test flag so changing the mode cannot reinterpret an existing payment.
// Disabling test mode also disables simulation of outstanding test invoices.
func (s *Service) GetPaymentConfig(ctx context.Context) (*PaymentConfigResponse, error) {
	config, err := s.repo.GetPaymentConfig(ctx, paymentSettingsID)
	if err != nil {
		return nil, err
	}
	return &PaymentConfigResponse{TestMode: config.TestMode, UpdatedAt: config.UpdatedAt}, nil
}

// UpdatePaymentConfig switches future checkouts between application test mode
// and real Telegram Stars invoices.
func (s *Service) UpdatePaymentConfig(ctx context.Context, testMode bool) (*PaymentConfigResponse, error) {
	config, err := s.repo.UpdatePaymentConfig(ctx, paymentSettingsID, testMode)
	if err != nil {
		return nil, err
	}
	return &PaymentConfigResponse{TestMode: config.TestMode, UpdatedAt: config.UpdatedAt}, nil
}
