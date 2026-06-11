package users

import (
	"telegram-marketplace/internal/core/membership/users/model"
	"time"
)

// --- Request DTOs ---

type CreateUserRequest struct {
	FirstName   string `json:"first_name" binding:"required"`
	LastName    string `json:"last_name"`
	Username    string `json:"username"`
	TelegramID  int64  `json:"telegram_id" binding:"required"`
	PhoneNumber string `json:"phone_number"`
	ReferredBy  int64  `json:"referred_by"`
}

type UpdateUserRequest struct {
	FirstName   *string `json:"first_name"`
	LastName    *string `json:"last_name"`
	Username    *string `json:"username"`
	PhoneNumber *string `json:"phone_number"`
}

type BanUserRequest struct {
	IsBanned bool `json:"is_banned"`
}

// --- Response DTOs ---

type UserResponse struct {
	ID            string     `json:"id"`
	FirstName     string     `json:"first_name"`
	LastName      string     `json:"last_name"`
	Username      string     `json:"username"`
	TelegramID    int64      `json:"telegram_id"`
	PhoneNumber   string     `json:"phone_number"`
	HasActivePlan bool       `json:"has_active_plan"`
	ActivePlanID  *string    `json:"active_plan_id,omitempty"`
	WalletBalance float64    `json:"wallet_balance"`
	PlanExpireAt  *time.Time `json:"plan_expire_at,omitempty"`
	ReferredBy    *int64     `json:"referred_by,omitempty"`
	IsBanned      bool       `json:"is_banned"`
	CreatedAt     time.Time  `json:"created_at"`
}

func toResponse(u *model.User) UserResponse {
	return UserResponse{
		ID:            u.ID,
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		Username:      u.Username,
		TelegramID:    u.TelegramID,
		PhoneNumber:   u.PhoneNumber,
		HasActivePlan: u.HasActivePlan,
		ActivePlanID:  u.ActivePlanID,
		WalletBalance: u.WalletBalance,
		PlanExpireAt:  u.PlanExpireAt,
		ReferredBy:    u.ReferredBy,
		IsBanned:      u.IsBanned,
		CreatedAt:     u.CreatedAt,
	}
}
