package model

// Payer is deliberately limited to the identity needed by administrators.
type Payer struct {
	ID         string `json:"id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Username   string `json:"username"`
	TelegramID int64  `json:"telegram_id"`
}

// AdminPayment enriches an attempt without exposing raw provider/checkout data.
type AdminPayment struct {
	Payment
	User          *Payer  `db:"user"`
	TargetTitle   string  `db:"target_title"`
	ProductID     *string `db:"product_id"`
	Quantity      int     `db:"quantity"`
	CouponCode    string  `db:"coupon_code"`
	DiscountToman int64   `db:"discount_toman"`
	DiscountStars int64   `db:"discount_stars"`
}

type Summary struct {
	Total     int64 `json:"total"`
	Succeeded int64 `json:"succeeded"`
	Pending   int64 `json:"pending"`
	Failed    int64 `json:"failed"`
	Refunded  int64 `json:"refunded"`
	TestTotal int64 `json:"test_total"`
	PaidStars int64 `json:"paid_stars"`
}
