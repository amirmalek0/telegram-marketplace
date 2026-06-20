package products

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/catalog/products/repository"
	"telegram-marketplace/pkg/pagination"
)

// isValidationError checks if the error is a validation error that should return 400 Bad Request.
func isValidationError(err error) bool {
	return errors.Is(err, repository.ErrInvalidCategory) ||
		errors.Is(err, ErrInvalidFileID) ||
		errors.Is(err, ErrInvalidMessageID) ||
		errors.Is(err, ErrInvalidInventoryID) ||
		errors.Is(err, ErrInvalidBundleID) ||
		errors.Is(err, ErrInvalidAPIID) ||
		errors.Is(err, ErrInvalidDeliveryType)
}

// Handler wires HTTP concerns to the Service layer.
type Handler struct {
	service *Service
}

// NewHandler constructs a Handler with the given Service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create accepts a JSON payload and stores a new product.
func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		if isValidationError(err) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, toResponse(product))
}

// List returns a paginated list of products.
func (h *Handler) List(c *gin.Context) {
	params := pagination.FromQuery(c)

	result, err := h.service.List(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetByID returns a single product by its internal UUID and increments its view count.
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")

	product, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Best-effort: increment views in the background (don't block the response).
	_ = h.service.IncrementViews(c.Request.Context(), id)
	product.ViewsCount++

	c.JSON(http.StatusOK, toResponse(product))
}

// Update modifies an existing product.
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product, err := h.service.Update(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if isValidationError(err) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(product))
}

// Delete permanently removes a product from the database.
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
