package admins

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Handler exposes admin HTTP endpoints.
type Handler struct {
	service *Service
}

// NewHandler creates a new admin handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create handles POST /api/admin/admins
func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.Create(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "admin created"})
}

// List handles GET /api/admin/admins
// Query params: page (default 1), limit (default 20, max 100)
func (h *Handler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit

	admins, err := h.service.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	total, err := h.service.Count(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"admins":      admins,
		"page":        page,
		"limit":       limit,
		"total":       total,
		"total_pages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

// Get handles GET /api/admin/admins/:id
func (h *Handler) Get(c *gin.Context) {
	id := c.Param("id")
	admin, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}
	c.JSON(http.StatusOK, admin)
}

// Update handles PUT /api/admin/admins/:id
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.Update(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "admin updated"})
}

// Delete handles DELETE /api/admin/admins/:id
func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "admin deleted"})
}
