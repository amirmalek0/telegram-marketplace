package broadcasts

import (
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/broadcasts/repository"
	"telegram-marketplace/pkg/pagination"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidMessage), errors.Is(err, ErrInvalidID):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "این اعلان در دسترس نیست"})
	case errors.Is(err, repository.ErrUserUnavailable):
		c.JSON(http.StatusForbidden, gin.H{"error": "دسترسی به اعلان‌ها ممکن نیست"})
	case errors.Is(err, repository.ErrPublishConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "این درخواست انتشار قبلاً برای پیام دیگری استفاده شده است"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "عملیات اعلان‌ها انجام نشد؛ دوباره تلاش کنید"})
	}
}

func (h *Handler) Publish(c *gin.Context) {
	adminID, ok := middleware.GetAdminID(c)
	if !ok {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	var req PublishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "عنوان، متن و شناسه درخواست معتبر لازم است"})
		return
	}
	result, err := h.service.Publish(c.Request.Context(), adminID, req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}
func (h *Handler) List(c *gin.Context) {
	result, err := h.service.List(c.Request.Context(), pagination.FromQuery(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
func (h *Handler) Archive(c *gin.Context) {
	if err := h.service.Archive(c.Request.Context(), c.Param("id")); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
func telegramID(c *gin.Context) (int64, bool) {
	id, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.AbortWithStatus(http.StatusUnauthorized)
	}
	return id, ok
}
func (h *Handler) Inbox(c *gin.Context) {
	id, ok := telegramID(c)
	if !ok {
		return
	}
	result, err := h.service.Inbox(c.Request.Context(), id, pagination.FromQuery(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
func (h *Handler) Unread(c *gin.Context) {
	id, ok := telegramID(c)
	if !ok {
		return
	}
	count, err := h.service.Unread(c.Request.Context(), id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}
func (h *Handler) MarkRead(c *gin.Context) {
	id, ok := telegramID(c)
	if !ok {
		return
	}
	readAt, err := h.service.MarkRead(c.Request.Context(), id, c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"read_at": readAt})
}
func (h *Handler) MarkAllRead(c *gin.Context) {
	id, ok := telegramID(c)
	if !ok {
		return
	}
	if err := h.service.MarkAllRead(c.Request.Context(), id); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
