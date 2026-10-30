package botmessages

import (
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/botmessages/model"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{service: s} }
func (h *Handler) List(c *gin.Context) {
	value, err := h.service.Load(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "دریافت پیام‌های ربات ناموفق بود"})
		return
	}
	c.JSON(200, value)
}
func (h *Handler) Save(c *gin.Context) {
	admin, ok := middleware.GetAdminID(c)
	if !ok {
		c.Status(403)
		return
	}
	var input model.Config
	decoder := json.NewDecoder(http.MaxBytesReader(c.Writer, c.Request.Body, 512<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		c.JSON(400, gin.H{"error": "درخواست معتبر نیست"})
		return
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		c.Status(400)
		return
	}
	value, err := h.service.Save(c.Request.Context(), input, admin)
	if err != nil {
		status, msg := 500, "ذخیره پیام‌ها ناموفق بود"
		if errors.Is(err, model.ErrInvalid) {
			status, msg = 422, err.Error()
		}
		if errors.Is(err, model.ErrConflict) {
			status, msg = 409, err.Error()
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}
	c.JSON(200, value)
}
