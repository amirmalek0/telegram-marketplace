package model

import "time"

// Buyer is a minimal customer identity exposed only by admin order listings.
type Buyer struct {
	ID         string `json:"id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Username   string `json:"username"`
	TelegramID int64  `json:"telegram_id"`
}

type AdminOrder struct {
	Order
	User *Buyer `db:"user" json:"user"`
}

type Summary struct {
	Total     int64 `json:"total"`
	Pending   int64 `json:"pending"`
	Paid      int64 `json:"paid"`
	PaidStars int64 `json:"paid_stars"`
}

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
	CouponCode     string      `db:"coupon_code" json:"coupon_code"`
	Amount         float64     `db:"amount" json:"amount"`
	DiscountAmount float64     `db:"discount_amount" json:"discount_amount"`
	PaymentMethod  *string     `db:"payment_method" json:"payment_method,omitempty"`
	Stars          int64       `db:"stars" json:"stars"`
	ProductTitle   string      `db:"product_title" json:"product_title"`
	DeliveryStatus string      `db:"delivery_status" json:"delivery_status"`
	DeliveryItems  int         `db:"delivery_item_count" json:"delivery_item_count"`
	Status         OrderStatus `db:"status" json:"status"`
	PaidAt         *time.Time  `db:"paid_at" json:"paid_at,omitempty"`
	CreatedAt      time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time   `db:"updated_at" json:"updated_at"`
}
