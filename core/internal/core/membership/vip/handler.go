package vip

import (
	"errors"
	"net/http"

	"telegram-marketplace/internal/core/membership/vip/repository"
	"telegram-marketplace/pkg/pagination"

	"github.com/gin-gonic/gin"
)

// Handler wires HTTP concerns to the Service layer.
type Handler struct {
	service *Service
}

// NewHandler constructs a Handler with the given Service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create handles POST /vip/plan - creates a new VIP plan.
func (h *Handler) Create(c *gin.Context) {
	var req CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, ErrInvalidStatus) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, toPlanResponse(plan))
}

// List handles GET /vip/plan - returns a paginated list of VIP plans.
func (h *Handler) List(c *gin.Context) {
	paginationParams := pagination.FromQuery(c)

	result, err := h.service.List(c.Request.Context(), paginationParams)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetByID handles GET /vip/plan/:id - returns a single VIP plan.
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")

	plan, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toPlanResponse(plan))
}

// Update handles PATCH /vip/plan/:id - applies partial changes to a VIP plan.
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")

	var req UpdatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan, err := h.service.Update(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, ErrInvalidStatus) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toPlanResponse(plan))
}

// Delete handles DELETE /vip/plan/:id - permanently removes a VIP plan.
func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
