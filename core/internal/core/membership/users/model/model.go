package model

import "time"

type User struct {
	ID            string     `db:"id"`
	FirstName     string     `db:"first_name"`
	LastName      string     `db:"last_name"`
	Username      string     `db:"username"`
	TelegramID    int64      `db:"telegram_id"`
	PhoneNumber   string     `db:"phone_number"`
	HasActivePlan bool       `db:"has_active_plan"`
	ActivePlanID  *string    `db:"active_plan_id"`
	WalletBalance int64      `db:"wallet_balance"`
	PlanExpireAt  *time.Time `db:"plan_expire_at"`
	ReferredBy    *int64     `db:"referred_by"`
	IsBanned      bool       `db:"is_banned"`
	CreatedAt     time.Time  `db:"created_at"`
}
