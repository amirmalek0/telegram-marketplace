package model

import "time"

// PaymentStatus represents the status of a payment.
type PaymentStatus string

// Payment status constants.
const (
	StatusPending   PaymentStatus = "pending"
	StatusSucceeded PaymentStatus = "succeeded"
	StatusFailed    PaymentStatus = "failed"
	StatusRefunded  PaymentStatus = "refunded"
)

// ValidPaymentStatuses returns all valid payment statuses.
func ValidPaymentStatuses() []PaymentStatus {
	return []PaymentStatus{
		StatusPending,
		StatusSucceeded,
		StatusFailed,
		StatusRefunded,
	}
}

// IsValid checks if the payment status is valid.
func (s PaymentStatus) IsValid() bool {
	for _, valid := range ValidPaymentStatuses() {
		if s == valid {
			return true
		}
	}
	return false
}

// Payment represents a payment in the system.
type Payment struct {
	ID            string        `db:"id" json:"id"`
	OrderID       string        `db:"order_id" json:"order_id"`
	Provider      string        `db:"provider" json:"provider"`
	GatewayTrxID  *string       `db:"gateway_trx_id" json:"gateway_trx_id,omitempty"`
	Amount        float64       `db:"amount" json:"amount"`
	Status        PaymentStatus `db:"status" json:"status"`
	CallbackData  []byte        `db:"callback_data" json:"callback_data,omitempty"`
	CreatedAt     time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time     `db:"updated_at" json:"updated_at"`
}

// PaymentResult represents the result of creating a payment.
type PaymentResult struct {
	PaymentURL   string `json:"payment_url,omitempty"`
	Authority    string `json:"authority,omitempty"`
	TrackingCode string `json:"tracking_code,omitempty"`
	Message      string `json:"message,omitempty"`
}

// VerificationResult represents the result of verifying a payment.
type VerificationResult struct {
	Success      bool    `json:"success"`
	Amount       float64 `json:"amount"`
	TrackingCode string  `json:"tracking_code,omitempty"`
	CardNumber   string  `json:"card_number,omitempty"`
	Message      string  `json:"message,omitempty"`
}

// RefundResult represents the result of a refund operation.
type RefundResult struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}