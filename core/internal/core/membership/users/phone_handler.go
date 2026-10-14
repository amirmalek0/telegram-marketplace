package users

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"telegram-marketplace/internal/app/middleware"
)

func (h *Handler) PhoneVerification(c *gin.Context) {
	id, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram authentication required"})
		return
	}
	required, err := h.phonePolicy.PhoneVerificationRequired(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "دریافت تنظیمات ناموفق بود"})
		return
	}
	verified, err := h.service.PhoneVerified(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "بررسی شماره تلفن ناموفق بود"})
		return
	}
	// No phone number or account data is disclosed by this bootstrap endpoint.
	c.JSON(http.StatusOK, gin.H{"required": required, "verified": verified})
}
