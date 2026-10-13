package settings

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) ListContent(c *gin.Context) {
	result, err := h.service.ListContent(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت متن‌های مینی‌اپ ناموفق بود"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) UpdateContent(c *gin.Context) {
	adminID, ok := middleware.GetAdminID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}
	var req UpdateContentRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Value == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "value is required"})
		return
	}
	entry, err := h.service.UpdateContent(c.Request.Context(), c.Param("key"), *req.Value, adminID)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entry)
}

func (h *Handler) ResetContent(c *gin.Context) {
	if err := h.service.ResetContent(c.Request.Context(), c.Param("key")); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
