package model

import "time"

// PaymentMethod identifies the checkout integration used for a payment.
type PaymentMethod string

const (
	// MethodTelegramStars is currently the only enabled payment method.
	MethodTelegramStars PaymentMethod = "telegram_stars"
	// StarsCurrency is Telegram's currency code for Stars payments.
	StarsCurrency = "XTR"
)

// EnabledMethods is the single source of truth for payment integrations that
// are currently exposed. Add a method here only after its processor and API
// adapter are fully implemented.
func EnabledMethods() []PaymentMethod {
	return []PaymentMethod{MethodTelegramStars}
}

func (m PaymentMethod) IsEnabled() bool {
	for _, enabled := range EnabledMethods() {
		if m == enabled {
			return true
		}
	}
	return false
}

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
	ID                    string        `db:"id" json:"id"`
	OrderID               string        `db:"order_id" json:"order_id"`
	Method                PaymentMethod `db:"method" json:"method"`
	Currency              string        `db:"currency" json:"currency"`
	AmountMinor           int64         `db:"amount_minor" json:"amount_minor"`
	CheckoutReference     string        `db:"checkout_reference" json:"checkout_reference"`
	ExternalTransactionID *string       `db:"external_transaction_id" json:"external_transaction_id,omitempty"`
	ProviderTransactionID *string       `db:"provider_transaction_id" json:"provider_transaction_id,omitempty"`
	IsTest                bool          `db:"is_test" json:"is_test"`
	Status                PaymentStatus `db:"status" json:"status"`
	ProviderData          []byte        `db:"provider_data" json:"-"`
	CreatedAt             time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt             time.Time     `db:"updated_at" json:"updated_at"`
	PaidAt                *time.Time    `db:"paid_at" json:"paid_at,omitempty"`
	RefundedAt            *time.Time    `db:"refunded_at" json:"refunded_at,omitempty"`
}
