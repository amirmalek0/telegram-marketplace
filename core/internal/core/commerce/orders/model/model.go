package model

import "time"

// OrderStatus represents the status of an order.
type OrderStatus string

// Order status constants.
const (
	StatusPending   OrderStatus = "pending"
	StatusPaid      OrderStatus = "paid"
	StatusFailed    OrderStatus = "failed"
	StatusRefunded  OrderStatus = "refunded"
	StatusCancelled OrderStatus = "cancelled"
)

// ValidOrderStatuses returns all valid order statuses.
func ValidOrderStatuses() []OrderStatus {
	return []OrderStatus{
		StatusPending,
		StatusPaid,
		StatusFailed,
		StatusRefunded,
		StatusCancelled,
	}
}

// IsValid checks if the order status is valid.
func (s OrderStatus) IsValid() bool {
	for _, valid := range ValidOrderStatuses() {
		if s == valid {
			return true
		}
	}
	return false
}

// Order represents an order in the system (single product per order).
type Order struct {
	ID             string      `db:"id" json:"id"`
	UserID         string      `db:"user_id" json:"user_id"`
	ProductID      string      `db:"product_id" json:"product_id"`
	Quantity       int         `db:"quantity" json:"quantity"`
	CouponID       *string     `db:"coupon_id" json:"coupon_id,omitempty"`
	Amount         float64     `db:"amount" json:"amount"`
	DiscountAmount float64     `db:"discount_amount" json:"discount_amount"`
	PaymentMethod  *string     `db:"payment_method" json:"payment_method,omitempty"`
	Status         OrderStatus `db:"status" json:"status"`
	PaidAt         *time.Time  `db:"paid_at" json:"paid_at,omitempty"`
	CreatedAt      time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time   `db:"updated_at" json:"updated_at"`
}

// NewOrder constructs a new Order with pending status and current timestamps.
func NewOrder(userID, productID string, quantity int, couponID *string, amount, discountAmount float64) *Order {
	now := time.Now()
	return &Order{
		UserID:         userID,
		ProductID:      productID,
		Quantity:       quantity,
		CouponID:       couponID,
		Amount:         amount,
		DiscountAmount: discountAmount,
		Status:         StatusPending,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}
