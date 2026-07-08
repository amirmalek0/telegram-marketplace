package coupons

import (
	"telegram-marketplace/internal/core/commerce/coupons/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// --- Request DTOs ---

// CreateRequest represents the payload for creating a new coupon.
type CreateRequest struct {
	Code          string   `json:"code" binding:"required"`
	DiscountType  string   `json:"discount_type" binding:"required,oneof=static percentage"`
	DiscountValue float64  `json:"discount_value" binding:"required,gt=0"`
	UsageLimit    int      `json:"usage_limit"`
	ExpiresAt     *string  `json:"expires_at"`
	ProductIDs    []string `json:"product_ids"` // Empty means applies to all products
}

// UpdateRequest represents the payload for updating a coupon.
type UpdateRequest struct {
	Code          *string   `json:"code"`
	DiscountType  *string   `json:"discount_type" binding:"omitempty,oneof=static percentage"`
	DiscountValue *float64  `json:"discount_value" binding:"omitempty,gt=0"`
	UsageLimit    *int      `json:"usage_limit"`
	ExpiresAt     *string   `json:"expires_at"`
	IsActive      *bool     `json:"is_active"`
	ProductIDs    *[]string `json:"product_ids"` // nil means no change, empty slice means all products
}

// ValidateRequest represents the payload for validating a coupon code.
type ValidateRequest struct {
	Code      string `json:"code" binding:"required"`
	ProductID string `json:"product_id"` // Optional: check if coupon applies to specific product
}

// --- Response DTOs ---

// Response represents a coupon in API responses.
type Response struct {
	ID            string     `json:"id"`
	Code          string     `json:"code"`
	DiscountType  string     `json:"discount_type"`
	DiscountValue float64    `json:"discount_value"`
	UsageLimit    int        `json:"usage_limit"`
	UsageCount    int        `json:"usage_count"`
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`
	IsActive      bool       `json:"is_active"`
	ProductIDs    []string   `json:"product_ids"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ValidateResponse represents the validation result for a coupon.
type ValidateResponse struct {
	Valid         bool     `json:"valid"`
	Code          string   `json:"code"`
	DiscountType  string   `json:"discount_type"`
	DiscountValue float64  `json:"discount_value"`
	ProductIDs    []string `json:"product_ids"`
	Message       string   `json:"message,omitempty"`
}

// PaginatedResponse is a paginated list of coupon responses.
type PaginatedResponse = pagination.Response[Response]

// toResponse converts a model.Coupon to a Response.
func toResponse(c *model.Coupon) Response {
	return Response{
		ID:            c.ID,
		Code:          c.Code,
		DiscountType:  string(c.DiscountType),
		DiscountValue: c.DiscountValue,
		UsageLimit:    c.UsageLimit,
		UsageCount:    c.UsageCount,
		ExpiresAt:     c.ExpiresAt,
		IsActive:      c.IsActive,
		ProductIDs:    c.ProductIDs,
		CreatedAt:     c.CreatedAt,
		UpdatedAt:     c.UpdatedAt,
	}
}
