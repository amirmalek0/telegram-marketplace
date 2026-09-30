package tickets

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
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

// telegramUser represents the user data from Telegram initData.
type telegramUser struct {
	ID int64 `json:"id"`
}

// getTelegramUserID extracts the Telegram user ID from the initData.
func getTelegramUserID(c *gin.Context) (int64, bool) {
	initData := middleware.GetInitData(c)
	if initData == nil {
		return 0, false
	}

	userJSON := initData.Get("user")
	if userJSON == "" {
		return 0, false
	}

	var user telegramUser
	if err := json.Unmarshal([]byte(userJSON), &user); err != nil {
		return 0, false
	}

	if user.ID == 0 {
		return 0, false
	}

	return user.ID, true
}

// getAdminID extracts the admin ID from the JWT claims.
func getAdminID(c *gin.Context) (string, bool) {
	claims := middleware.GetAdminClaims(c)
	if claims == nil {
		return "", false
	}
	return claims.AdminID, true
}

// Create handles POST /tickets - creates a new ticket with initial message.
func (h *Handler) Create(c *gin.Context) {
	var req CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	telegramID, ok := getTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	ticket, err := h.service.CreateTicket(c.Request.Context(), telegramID, req)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, toTicketResponse(ticket))
}

// Get handles GET /tickets/:id - retrieves a ticket with its messages.
func (h *Handler) Get(c *gin.Context) {
	id := c.Param("id")
	adminID, _ := getAdminID(c)
	telegramID, _ := getTelegramUserID(c)
	if adminID == "" && telegramID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	result, err := h.service.GetTicketWithMessages(c.Request.Context(), id, adminID, telegramID)
	if err != nil {
		if errors.Is(err, ErrTicketAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "ticket access denied"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// List handles GET /tickets - lists tickets with pagination and optional filters.
func (h *Handler) List(c *gin.Context) {
	paginationParams := pagination.FromQuery(c)

	var filters TicketListFilters
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	filters.Status = nonEmptyFilter(filters.Status)
	filters.Priority = nonEmptyFilter(filters.Priority)
	filters.Category = nonEmptyFilter(filters.Category)
	filters.UserID = nonEmptyFilter(filters.UserID)

	adminID, _ := getAdminID(c)
	telegramID, _ := getTelegramUserID(c)

	if adminID == "" && telegramID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	result, err := h.service.ListTickets(c.Request.Context(), adminID, telegramID, filters, paginationParams)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// Update handles PATCH /tickets/:id - updates ticket fields.
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")

	var req UpdateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ticket, err := h.service.UpdateTicket(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toTicketResponse(ticket))
}

// Delete handles DELETE /tickets/:id - permanently removes a ticket.
func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.DeleteTicket(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// AddMessage handles POST /tickets/:id/messages - adds a message to a ticket.
func (h *Handler) AddMessage(c *gin.Context) {
	id := c.Param("id")

	var req AddMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID, _ := getAdminID(c)
	telegramID, _ := getTelegramUserID(c)

	if adminID == "" && telegramID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	message, err := h.service.AddMessage(c.Request.Context(), id, adminID, telegramID, req.Message)
	if err != nil {
		if errors.Is(err, ErrTicketAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "ticket access denied"})
			return
		}
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, toTicketMessageResponse(message))
}

// ListMessages handles GET /tickets/:id/messages - retrieves all messages for a ticket.
func (h *Handler) ListMessages(c *gin.Context) {
	id := c.Param("id")
	telegramID, ok := getTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	messages, err := h.service.ListMessages(c.Request.Context(), id, telegramID)
	if err != nil {
		if errors.Is(err, ErrTicketAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "ticket access denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]TicketMessageResponse, len(messages))
	for i, msg := range messages {
		response[i] = toTicketMessageResponse(msg)
	}

	c.JSON(http.StatusOK, response)
}

func nonEmptyFilter(value *string) *string {
	if value == nil || *value == "" {
		return nil
	}
	return value
}
