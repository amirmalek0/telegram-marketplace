package model

import "time"

// TransactionType defines the type of wallet transaction
type TransactionType string

const (
	TypePurchase    TransactionType = "purchase"
	TypeReward      TransactionType = "reward"
	TypeTopup       TransactionType = "topup"
	TypeRefund      TransactionType = "refund"
	TypeAdminAdjust TransactionType = "admin_adjust"
)

type WalletTransaction struct {
	ID            string          `db:"id" json:"id"`
	UserID        string          `db:"user_id" json:"user_id"`
	Type          TransactionType `db:"type" json:"type"`
	Amount        float64         `db:"amount" json:"amount"`
	BalanceBefore float64         `db:"balance_before" json:"balance_before"`
	BalanceAfter  float64         `db:"balance_after" json:"balance_after"`
	Description   string          `db:"description" json:"description"`
	CreatedAt     time.Time       `db:"created_at" json:"created_at"`
}
