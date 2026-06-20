// Package pagination provides reusable pagination types and helpers
// that can be shared across all API domains.
package pagination

import (
	"math"
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	defaultPage    = 1
	defaultPerPage = 20
	maxPerPage     = 100
)

// Params holds the normalised page/per_page values parsed from a request.
type Params struct {
	Page    int
	PerPage int
}

// Offset returns the SQL OFFSET value derived from the current page.
func (params Params) Offset() int {
	return (params.Page - 1) * params.PerPage
}

// FromQuery parses ?page and ?per_page query parameters from a Gin context
// and returns normalised Params. Invalid or out-of-range values fall back to
// the defaults (page=1, per_page=20, max per_page=100).
func FromQuery(c *gin.Context) Params {
	page, err := strconv.Atoi(c.DefaultQuery("page", strconv.Itoa(defaultPage)))
	if err != nil || page <= 0 {
		page = defaultPage
	}

	perPage, err := strconv.Atoi(c.DefaultQuery("per_page", strconv.Itoa(defaultPerPage)))
	if err != nil || perPage <= 0 || perPage > maxPerPage {
		perPage = defaultPerPage
	}

	return Params{Page: page, PerPage: perPage}
}

// Response is the generic paginated envelope returned by list endpoints.
// Use the any type for Data so it can wrap any slice of domain DTOs.
type Response[T any] struct {
	Data        []T   `json:"data"`
	Total       int64 `json:"total"`
	Page        int   `json:"page"`
	PerPage     int   `json:"per_page"`
	TotalPages  int   `json:"total_pages"`
	HasNextPage bool  `json:"has_next_page"`
	HasPrevPage bool  `json:"has_prev_page"`
}

// NewResponse builds a Response from a data slice, total count, and the
// original Params used for the query.
func NewResponse[T any](data []T, total int64, params Params) Response[T] {
	totalPages := int(math.Ceil(float64(total) / float64(params.PerPage)))
	return Response[T]{
		Data:        data,
		Total:       total,
		Page:        params.Page,
		PerPage:     params.PerPage,
		TotalPages:  totalPages,
		HasNextPage: params.Page < totalPages,
		HasPrevPage: params.Page > 1,
	}
}
