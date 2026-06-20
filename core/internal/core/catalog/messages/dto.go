package messages

import (
	"telegram-marketplace/internal/core/catalog/messages/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Request DTOs ---

// CreateRequest represents the payload for creating a new message.
type CreateRequest struct {
	Content string `json:"content" binding:"required"`
}

// UpdateRequest represents the payload for updating a message.
type UpdateRequest struct {
	Content *string `json:"content"`
}

// --- Response DTOs ---

// PaginatedResponse is a paginated list of message responses.
type PaginatedResponse = pagination.Response[Response]

// Response represents a message in API responses.
type Response struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// toResponse converts a model.DeliveryMessage to a Response.
func toResponse(m *model.DeliveryMessage) Response {
	return Response{
		ID:        m.ID,
		Content:   m.Content,
		CreatedAt: m.CreatedAt,
	}
}
