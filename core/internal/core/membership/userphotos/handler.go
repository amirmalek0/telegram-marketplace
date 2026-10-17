package userphotos

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"net/http"
	"strconv"
	"telegram-marketplace/internal/app/middleware"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{s} }
func validID(c *gin.Context, key string) bool {
	if _, err := uuid.Parse(c.Param(key)); err != nil {
		c.AbortWithStatusJSON(400, gin.H{"error": "invalid identifier"})
		return false
	}
	return true
}
func photoError(c *gin.Context, err error) {
	status := http.StatusServiceUnavailable
	if errors.Is(err, pgx.ErrNoRows) {
		status = 404
	}
	c.JSON(status, gin.H{"error": "profile photos unavailable"})
}
func (h *Handler) List(c *gin.Context) {
	if !validID(c, "id") {
		return
	}
	offset, _ := strconv.Atoi(c.Query("offset"))
	if offset < 0 {
		offset = 0
	}
	result, err := h.service.List(c.Request.Context(), c.Param("id"), 30, offset)
	if err != nil {
		photoError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(200, result)
}
func (h *Handler) Sync(c *gin.Context) {
	if !validID(c, "id") {
		return
	}
	if err := h.service.Request(c.Request.Context(), c.Param("id")); err != nil {
		photoError(c, err)
		return
	}
	c.JSON(202, gin.H{"status": "queued"})
}
func (h *Handler) Content(c *gin.Context) {
	if !validID(c, "id") || !validID(c, "photoID") {
		return
	}
	if middleware.GetAdminClaims(c) == nil {
		telegramID, ok := middleware.GetTelegramUserID(c)
		if !ok {
			c.AbortWithStatus(401)
			return
		}
		owner, err := h.service.Owner(c.Request.Context(), c.Param("id"))
		if err != nil {
			photoError(c, err)
			return
		}
		if owner != telegramID {
			c.AbortWithStatus(403)
			return
		}
	}
	body, size, kind, err := h.service.Open(c.Request.Context(), c.Param("id"), c.Param("photoID"))
	if err != nil {
		photoError(c, err)
		return
	}
	defer body.Close()
	c.DataFromReader(200, size, kind, body, map[string]string{"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})
}
