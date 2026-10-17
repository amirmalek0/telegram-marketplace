package users

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/pkg/pagination"
)

// Handler wires HTTP concerns to the Service layer.
type Handler struct {
	service     *Service
	phonePolicy middleware.PhonePolicy
}

// Me returns the authenticated Telegram user's current profile and account state.
func (h *Handler) Me(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	user, err := h.service.GetByTelegramID(c.Request.Context(), telegramID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toResponse(user))
}

// NewHandler constructs a Handler with the given Service.
func NewHandler(service *Service, phonePolicy middleware.PhonePolicy) *Handler {
	return &Handler{service: service, phonePolicy: phonePolicy}
}

// Save creates a new user or updates an existing one by Telegram ID.
func (h *Handler) Save(c *gin.Context) {
	var req CreateUserRequest
	id, ok := middleware.GetTelegramUserID(c)
	if !ok || json.Unmarshal([]byte(middleware.GetInitData(c).Get("user")), &req) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	// Identity and profile come exclusively from signed Telegram data. Never
	// accept phone verification, another user's ID, or profile data from JSON.
	req.TelegramID = id
	req.PhoneNumber = ""
	req.ReferredBy = 0
	// Mark Mini App visits even when Telegram supplies no photo. The archive
	// refreshes in the background; only a successful sync may clear its avatar.
	// Bot updates omit PhotoURL and do not trigger visit refreshes.
	if req.PhotoURL == nil {
		emptyPhoto := ""
		req.PhotoURL = &emptyPhoto
	}

	user, created, err := h.service.UpsertWithReferral(c.Request.Context(), req, middleware.GetInitData(c).Get("start_param"))
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	c.JSON(status, gin.H{"id": user.ID, "telegram_id": user.TelegramID})
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
	callerID, ok := middleware.GetTelegramUserID(c)
	if !ok || callerID != telegramID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
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
