package settings

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func (h *Handler) General(c *gin.Context) {
	required, err := h.service.PhoneVerificationRequired(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "دریافت تنظیمات ناموفق بود"})
		return
	}
	c.JSON(http.StatusOK, GeneralResponse{RequirePhoneVerification: required})
}

func (h *Handler) UpdateGeneral(c *gin.Context) {
	var req UpdateGeneralRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.RequirePhoneVerification == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "require_phone_verification must be a boolean"})
		return
	}
	result, err := h.service.UpdateGeneral(c.Request.Context(), *req.RequirePhoneVerification)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "ذخیره تنظیمات ناموفق بود"})
		return
	}
	c.JSON(http.StatusOK, result)
}
