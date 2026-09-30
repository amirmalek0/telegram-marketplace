package payments

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/pkg/pagination"
)

// Handler exposes the currently available payment administration API.
// User checkout routes will be added once a processor is implemented.
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// AdminList returns all persisted payment attempts.
func (h *Handler) AdminList(c *gin.Context) {
	params := pagination.FromQuery(c)

	result, err := h.service.ListAll(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
