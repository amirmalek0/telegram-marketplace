package tickets

import (
	"time"

	"telegram-marketplace/internal/core/membership/tickets/model"
	"telegram-marketplace/pkg/pagination"
)

// --- Request DTOs ---

// CreateTicketRequest represents the payload for creating a new ticket.
type CreateTicketRequest struct {
	Subject  string `json:"subject" binding:"required,min=3,max=200"`
	Priority string `json:"priority" binding:"omitempty,oneof=low medium high urgent"`
	Category string `json:"category" binding:"omitempty,min=2,max=50"`
	Message  string `json:"message" binding:"required,min=1"`
}

// UpdateTicketRequest represents the payload for updating a ticket.
type UpdateTicketRequest struct {
	Subject  *string `json:"subject" binding:"omitempty,min=3,max=200"`
	Status   *string `json:"status" binding:"omitempty,oneof=open in_progress closed"`
	Priority *string `json:"priority" binding:"omitempty,oneof=low medium high urgent"`
	Category *string `json:"category" binding:"omitempty,min=2,max=50"`
}

// AddMessageRequest represents the payload for adding a message to a ticket.
type AddMessageRequest struct {
	Message string `json:"message" binding:"required,min=1"`
}

// TicketListFilters represents query parameters for filtering tickets.
type TicketListFilters struct {
	Status   *string `form:"status"`
	Priority *string `form:"priority"`
	Category *string `form:"category"`
	UserID   *string `form:"user_id"`
}

// --- Response DTOs ---

// TicketResponse represents a ticket in API responses.
type TicketResponse struct {
	ID            string              `json:"id"`
	UserID        string              `json:"user_id"`
	Subject       string              `json:"subject"`
	Status        string              `json:"status"`
	Priority      string              `json:"priority"`
	Category      string              `json:"category"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
	ClosedAt      *time.Time          `json:"closed_at,omitempty"`
	LastMessageAt time.Time           `json:"last_message_at"`
	User          *TicketUserResponse `json:"user,omitempty"`
}

// TicketUserResponse contains the complete user profile shown to administrators.
// It is omitted from Telegram user responses.
type TicketUserResponse struct {
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

// TicketMessageResponse represents a ticket message in API responses.
type TicketMessageResponse struct {
	ID         string    `json:"id"`
	TicketID   string    `json:"ticket_id"`
	SenderType string    `json:"sender_type"`
	SenderID   string    `json:"sender_id"`
	Message    string    `json:"message"`
	CreatedAt  time.Time `json:"created_at"`
}

// TicketWithMessagesResponse represents a ticket with its messages.
type TicketWithMessagesResponse struct {
	Ticket   TicketResponse          `json:"ticket"`
	Messages []TicketMessageResponse `json:"messages"`
}

// PaginatedTicketResponse is the paginated envelope for the ticket list endpoint.
type PaginatedTicketResponse = pagination.Response[TicketResponse]

// --- Transformation functions ---

// toTicketResponse converts a model.Ticket to TicketResponse.
func toTicketResponse(t *model.Ticket) TicketResponse {
	return TicketResponse{
		ID:            t.ID,
		UserID:        t.UserID,
		Subject:       t.Subject,
		Status:        t.Status,
		Priority:      t.Priority,
		Category:      t.Category,
		CreatedAt:     t.CreatedAt,
		UpdatedAt:     t.UpdatedAt,
		ClosedAt:      t.ClosedAt,
		LastMessageAt: t.LastMessageAt,
	}
}

// toTicketMessageResponse converts a model.TicketMessage to TicketMessageResponse.
func toTicketMessageResponse(m *model.TicketMessage) TicketMessageResponse {
	return TicketMessageResponse{
		ID:         m.ID,
		TicketID:   m.TicketID,
		SenderType: m.SenderType,
		SenderID:   m.SenderID,
		Message:    m.Message,
		CreatedAt:  m.CreatedAt,
	}
}
