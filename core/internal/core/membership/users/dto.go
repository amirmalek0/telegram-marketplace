package users

import (
	"telegram-marketplace/internal/core/membership/users/model"
	"telegram-marketplace/pkg/pagination"
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

// PaginatedResponse is the paginated envelope for the user list endpoint.
type PaginatedResponse = pagination.Response[Response]

type Response struct {
	ID            string     `json:"id"`
	FirstName     string     `json:"first_name"`
	LastName      string     `json:"last_name"`
	Username      string     `json:"username"`
	TelegramID    int64      `json:"telegram_id"`
	PhoneNumber   string     `json:"phone_number"`
	HasActivePlan bool       `json:"has_active_plan"`
	ActivePlanID  *string    `json:"active_plan_id,omitempty"`
	PlanExpireAt  *time.Time `json:"plan_expire_at,omitempty"`
	ReferredBy    *int64     `json:"referred_by,omitempty"`
	IsBanned      bool       `json:"is_banned"`
	CreatedAt     time.Time  `json:"created_at"`
}

func toResponse(user *model.User) Response {
	return Response{
		ID:            user.ID,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		Username:      user.Username,
		TelegramID:    user.TelegramID,
		PhoneNumber:   user.PhoneNumber,
		HasActivePlan: user.HasActivePlan,
		ActivePlanID:  user.ActivePlanID,
		PlanExpireAt:  user.PlanExpireAt,
		ReferredBy:    user.ReferredBy,
		IsBanned:      user.IsBanned,
		CreatedAt:     user.CreatedAt,
	}
}
