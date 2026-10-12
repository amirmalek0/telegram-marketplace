package vip

import (
	"telegram-marketplace/internal/core/membership/vip/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Request DTOs ---

// CreatePlanRequest represents the payload for creating a new VIP plan.
type CreatePlanRequest struct {
	Title      string `json:"title" binding:"required,min=1,max=100"`
	StarsPrice int64  `json:"stars_price" binding:"required,gt=0"`
	Duration   int    `json:"duration" binding:"required,gt=0"`
	Status     string `json:"status" binding:"omitempty,oneof=active inactive"`
}

// UpdatePlanRequest represents the payload for partially updating a VIP plan.
type UpdatePlanRequest struct {
	Title      *string `json:"title" binding:"omitempty,min=1,max=100"`
	StarsPrice *int64  `json:"stars_price" binding:"omitempty,gt=0"`
	Duration   *int    `json:"duration" binding:"omitempty,gt=0"`
	Status     *string `json:"status" binding:"omitempty,oneof=active inactive"`
}

// --- Response DTOs ---

// PlanResponse represents a VIP plan in API responses.
type PlanResponse struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	StarsPrice int64     `json:"stars_price"`
	Duration   int       `json:"duration"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

// PaginatedPlanResponse is the paginated envelope for the plan list endpoint.
type PaginatedPlanResponse = pagination.Response[PlanResponse]

// --- Transformation functions ---

// toPlanResponse converts a model.Plan to PlanResponse.
func toPlanResponse(p *model.Plan) PlanResponse {
	return PlanResponse{
		ID:         p.ID,
		Title:      p.Title,
		StarsPrice: p.StarsPrice,
		Duration:   p.Duration,
		Status:     string(p.Status),
		CreatedAt:  p.CreatedAt,
	}
}
