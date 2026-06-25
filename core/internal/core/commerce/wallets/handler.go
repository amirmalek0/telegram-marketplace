package wallets

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/commerce/wallets/model"
	"telegram-marketplace/pkg/pagination"
)

// Handler wires HTTP concerns to the Service layer.
type Handler struct {
	service *Service
}

// NewHandler constructs a Handler with the given Service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetBalance returns the current wallet balance for the authenticated Telegram user.
func (h *Handler) GetBalance(c *gin.Context) {
	telegramID := c.GetInt64("telegram_id")
	if telegramID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram user not found"})
		return
	}

	balance, err := h.service.GetBalanceByTelegramID(c.Request.Context(), telegramID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, BalanceResponse{
		TelegramID: telegramID,
		Balance:    balance,
	})
}

// GetTransactions returns a paginated list of wallet transactions for the authenticated Telegram user.
func (h *Handler) GetTransactions(c *gin.Context) {
	telegramID := c.GetInt64("telegram_id")
	if telegramID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram user not found"})
		return
	}

	params := pagination.FromQuery(c)

	result, err := h.service.GetTransactionsByTelegramID(c.Request.Context(), telegramID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// AdminGetBalance returns the current wallet balance for any user (admin only).
func (h *Handler) AdminGetBalance(c *gin.Context) {
	userID := c.Param("id")

	balance, err := h.service.GetBalance(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, BalanceResponse{
		UserID:  userID,
		Balance: balance,
	})
}

// AdminGetTransactions returns a paginated list of wallet transactions for any user (admin only).
func (h *Handler) AdminGetTransactions(c *gin.Context) {
	userID := c.Param("id")
	params := pagination.FromQuery(c)

	result, err := h.service.GetTransactions(c.Request.Context(), userID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// AdminAdjust manually credits or debits a user's wallet (admin only).
func (h *Handler) AdminAdjust(c *gin.Context) {
	var req AdminAdjustRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var (
		tx  *model.WalletTransaction
		err error
	)

	switch req.Operation {
	case OperationCredit:
		tx, err = h.service.Credit(c.Request.Context(), req.UserID, req.Amount, model.TypeAdminAdjust, req.Description)
	case OperationDebit:
		tx, err = h.service.Debit(c.Request.Context(), req.UserID, req.Amount, model.TypeAdminAdjust, req.Description)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "operation must be 'credit' or 'debit'"})
		return
	}

	if err != nil {
		status := http.StatusUnprocessableEntity
		if err == ErrInsufficientBalance {
			c.JSON(status, gin.H{"error": "insufficient wallet balance"})
			return
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toTransactionResponse(tx))
}
