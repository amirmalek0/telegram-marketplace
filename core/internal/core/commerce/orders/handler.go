package orders

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/orders/repository"
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

// GetByID returns a single order by its UUID.
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram user not found"})
		return
	}

	order, err := h.service.GetByIDForTelegramID(c.Request.Context(), id, telegramID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toResponse(order))
}

// List returns a paginated list of orders for the authenticated user.
func (h *Handler) List(c *gin.Context) {
	telegramID, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram user not found"})
		return
	}

	params := pagination.FromQuery(c)

	result, err := h.service.ListByTelegramID(c.Request.Context(), telegramID, params)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// AdminList returns a paginated list of all orders (admin only).
func (h *Handler) AdminList(c *gin.Context) {
	params := pagination.FromQuery(c)

	result, err := h.service.ListAll(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
