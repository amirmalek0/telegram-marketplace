package users

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Handler wires HTTP concerns to the Service layer.
type Handler struct {
	service *Service
}

// NewHandler constructs a Handler with the given Service (plain DI).
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create godoc
// POST /users
func (h *Handler) Create(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, toResponse(user))
}

// GetByID godoc
// GET /users/:id
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")

	user, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(user))
}

// List godoc
// GET /users?limit=20&offset=0
func (h *Handler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	users, err := h.service.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := make([]UserResponse, 0, len(users))
	for _, u := range users {
		resp = append(resp, toResponse(u))
	}
	c.JSON(http.StatusOK, resp)
}

// Update godoc
// PATCH /users/:id
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.service.Update(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(user))
}

// SetBanned godoc
// PATCH /users/:id/ban
func (h *Handler) SetBanned(c *gin.Context) {
	id := c.Param("id")

	var req BanUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.SetBanned(c.Request.Context(), id, req.IsBanned); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"is_banned": req.IsBanned})
}

// Delete godoc
// DELETE /users/:id
func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
