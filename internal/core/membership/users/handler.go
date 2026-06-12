package users

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/pkg/pagination"
)

// Handler wires HTTP concerns to the Service layer.
type Handler struct {
	service *Service
}

// NewHandler constructs a Handler with the given Service (plain DI).
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create registers a new user from the JSON body.
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

// GetByID returns a single user by their internal UUID.
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")

	user, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(user))
}

// GetByTelegramID returns a single user by their Telegram numeric ID.
func (h *Handler) GetByTelegramID(c *gin.Context) {
	rawID := c.Param("id")

	telegramID, err := strconv.ParseInt(rawID, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "telegram_id must be a valid integer"})
		return
	}

	user, err := h.service.GetByTelegramID(c.Request.Context(), telegramID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(user))
}

// List returns a paginated list of users ordered by creation date.
func (h *Handler) List(c *gin.Context) {
	paginationParams := pagination.FromQuery(c)

	result, err := h.service.List(c.Request.Context(), paginationParams)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// Update applies partial profile changes to an existing user.
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

// SetBanned bans or unbans a user by toggling the is_banned flag.
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

// Delete permanently removes a user by their internal UUID.
func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
