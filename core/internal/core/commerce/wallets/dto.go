package wallets

import (
	"telegram-marketplace/internal/core/commerce/wallets/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Constants ---

const (
	// OperationCredit adds funds to a user's wallet.
	OperationCredit = "credit"
	// OperationDebit deducts funds from a user's wallet.
	OperationDebit = "debit"
)

// --- Request DTOs ---

// AdminAdjustRequest represents a request to manually adjust a user's wallet balance.
type AdminAdjustRequest struct {
	UserID      string  `json:"user_id" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Operation   string  `json:"operation" binding:"required,oneof=credit debit"`
	Description string  `json:"description"`
}

// --- Response DTOs ---

// BalanceResponse represents the current wallet balance for a user.
type BalanceResponse struct {
	UserID     string  `json:"user_id,omitempty"`
	TelegramID int64   `json:"telegram_id,omitempty"`
	Balance    float64 `json:"balance"`
}

// TransactionResponse represents a single wallet transaction.
type TransactionResponse struct {
	ID            string    `json:"id"`
	Type          string    `json:"type"`
	Amount        float64   `json:"amount"`
	BalanceBefore float64   `json:"balance_before"`
	BalanceAfter  float64   `json:"balance_after"`
	Description   string    `json:"description"`
	CreatedAt     time.Time `json:"created_at"`
}

// PaginatedTransactionsResponse is the paginated envelope for transaction list endpoints.
type PaginatedTransactionsResponse = pagination.Response[TransactionResponse]

// toTransactionResponse converts a domain model to a response DTO.
func toTransactionResponse(tx *model.WalletTransaction) TransactionResponse {
	return TransactionResponse{
		ID:            tx.ID,
		Type:          string(tx.Type),
		Amount:        tx.Amount,
		BalanceBefore: tx.BalanceBefore,
		BalanceAfter:  tx.BalanceAfter,
		Description:   tx.Description,
		CreatedAt:     tx.CreatedAt,
	}
}
