package categories

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/core/catalog/categories/repository"
	"telegram-marketplace/pkg/pagination"
)

// Handler wires HTTP concerns to the Service layer.
type Handler struct {
	service *Service
}

// NewHandler constructs a Handler with the given Service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create registers a new category from a multipart/form-data request.
func (h *Handler) Create(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	icon, _ := c.FormFile("icon")

	cat, err := h.service.Create(c.Request.Context(), req, icon)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicate) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, toResponse(cat, h.service.Store()))
}

// List returns a paginated list of categories ordered by sort_order.
func (h *Handler) List(c *gin.Context) {
	paginationParams := pagination.FromQuery(c)

	result, err := h.service.List(c.Request.Context(), paginationParams)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetByID returns a single category by its internal UUID.
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")

	cat, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(cat, h.service.Store()))
}

// GetBySlug returns a single category by its unique slug.
func (h *Handler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")

	cat, err := h.service.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(cat, h.service.Store()))
}

// Update applies partial changes to an existing category.
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")

	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cat, err := h.service.Update(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(cat, h.service.Store()))
}

// SetActive enables or disables a category.
func (h *Handler) SetActive(c *gin.Context) {
	id := c.Param("id")

	var req SetActiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.SetActive(c.Request.Context(), id, req.Active); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"active": req.Active})
}

// Reorder bulk-updates sort_order for multiple categories.
func (h *Handler) Reorder(c *gin.Context) {
	var req ReorderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.Reorder(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// UploadIcon accepts a multipart file upload and replaces the category icon.
func (h *Handler) UploadIcon(c *gin.Context) {
	id := c.Param("id")

	icon, err := c.FormFile("icon")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "field 'icon' is required (multipart/form-data)"})
		return
	}

	cat, err := h.service.UploadIcon(c.Request.Context(), id, icon)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(cat, h.service.Store()))
}

// Delete permanently removes a category and its icon from storage.
func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
