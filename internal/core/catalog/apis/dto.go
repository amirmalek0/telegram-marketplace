package apis

import (
	"telegram-marketplace/internal/core/catalog/apis/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Request DTOs ---

// HeaderInput represents a header key-value pair in requests.
type HeaderInput struct {
	Key   string `json:"key" binding:"required"`
	Value string `json:"value" binding:"required"`
}

// CreateRequest represents the payload for creating a new API.
type CreateRequest struct {
	URL          string        `json:"url" binding:"required"`
	Method       string        `json:"method" binding:"required,oneof=GET POST"`
	Body         *string       `json:"body"`
	ResponsePath *string       `json:"response_path"`
	Headers      []HeaderInput `json:"headers"`
}

// UpdateRequest represents the payload for updating an API.
type UpdateRequest struct {
	URL          *string       `json:"url"`
	Method       *string       `json:"method" binding:"omitempty,oneof=GET POST"`
	Body         *string       `json:"body"`
	ResponsePath *string       `json:"response_path"`
	Headers      []HeaderInput `json:"headers"`
}

// --- Response DTOs ---

// PaginatedResponse is a paginated list of API responses.
type PaginatedResponse = pagination.Response[Response]

// Response represents an API in API responses.
type Response struct {
	ID           string         `json:"id"`
	URL          string         `json:"url"`
	Method       string         `json:"method"`
	Body         *string        `json:"body,omitempty"`
	ResponsePath *string        `json:"response_path,omitempty"`
	Headers      []model.Header `json:"headers"`
	CreatedAt    time.Time      `json:"created_at"`
}

// toResponse converts a model.API to a Response.
func toResponse(api *model.API) Response {
	return Response{
		ID:           api.ID,
		URL:          api.URL,
		Method:       api.Method,
		Body:         api.Body,
		ResponsePath: api.ResponsePath,
		Headers:      api.Headers,
		CreatedAt:    api.CreatedAt,
	}
}
