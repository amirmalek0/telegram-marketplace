package referrals

import (
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/referrals/model"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{service: s} }
func (h *Handler) Settings(c *gin.Context) {
	s, err := h.service.Settings(c.Request.Context())
	if err != nil {
		c.JSON(503, gin.H{"error": "دریافت تنظیمات دعوت ناموفق بود"})
		return
	}
	c.JSON(200, s)
}
func (h *Handler) UpdateSettings(c *gin.Context) {
	var req struct {
		Enabled        *bool   `json:"enabled" binding:"required"`
		InviterStars   *int64  `json:"inviter_stars" binding:"required"`
		InviteeStars   *int64  `json:"invitee_stars" binding:"required"`
		RewardTrigger  string  `json:"reward_trigger" binding:"required"`
		InviterMessage *string `json:"inviter_message"`
		InviteeMessage *string `json:"invitee_message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "همه تنظیمات دعوت و مبالغ صحیح را وارد کنید"})
		return
	}
	s := model.Settings{Enabled: *req.Enabled, InviterStars: *req.InviterStars, InviteeStars: *req.InviteeStars, RewardTrigger: req.RewardTrigger}
	if req.InviterMessage != nil {
		if !model.ValidMessage(*req.InviterMessage, "inviter") {
			c.JSON(400, gin.H{"error": "پیام دعوت‌کننده باید شامل {amount} و {invitee_name} باشد؛ حداکثر ۲۰۰۰ نویسه و فقط متغیرهای مجاز."})
			return
		}
		s.InviterMessage = *req.InviterMessage
	}
	if req.InviteeMessage != nil {
		if !model.ValidMessage(*req.InviteeMessage, "invitee") {
			c.JSON(400, gin.H{"error": "پیام دعوت‌شده باید شامل {amount} و {inviter_name} باشد؛ حداکثر ۲۰۰۰ نویسه و فقط متغیرهای مجاز."})
			return
		}
		s.InviteeMessage = *req.InviteeMessage
	}
	if !model.ValidSettings(s) {
		c.JSON(400, gin.H{"error": "مبلغ باید بین صفر و یک میلیون و شرط پاداش معتبر باشد"})
		return
	}
	admin, ok := middleware.GetAdminID(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}
	if err := h.service.SaveSettings(c.Request.Context(), s, admin); err != nil {
		if errors.Is(err, model.ErrPhoneVerificationDisabled) {
			c.JSON(http.StatusConflict, gin.H{"error": model.ErrPhoneVerificationDisabled.Error()})
			return
		}
		c.JSON(503, gin.H{"error": "ذخیره تنظیمات دعوت ناموفق بود"})
		return
	}
	s, err := h.service.Settings(c.Request.Context())
	if err != nil {
		c.JSON(503, gin.H{"error": "دریافت تنظیمات ذخیره‌شده ناموفق بود"})
		return
	}
	c.JSON(200, s)
}
func (h *Handler) Summary(c *gin.Context) {
	id, ok := middleware.GetTelegramUserID(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}
	s, err := h.service.Summary(c.Request.Context(), id)
	if err != nil {
		c.JSON(503, gin.H{"error": "دریافت اطلاعات دعوت ناموفق بود"})
		return
	}
	c.JSON(200, s)
}
