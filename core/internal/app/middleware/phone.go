package middleware

import (
	"context"
	"github.com/gin-gonic/gin"
	"net/http"
)

type PhonePolicy interface {
	PhoneVerificationRequired(context.Context) (bool, error)
}
type PhoneIdentity interface {
	PhoneVerified(context.Context, int64) (bool, error)
}

// RequireVerifiedPhone guards every domain route, including future ones. Only
// the explicitly registered onboarding routes live outside this group.
func RequireVerifiedPhone(policy PhonePolicy, identity PhoneIdentity) gin.HandlerFunc {
	return func(c *gin.Context) {
		if GetAdminClaims(c) != nil {
			c.Next()
			return
		}
		id, ok := GetTelegramUserID(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": errTelegramAuthRequired})
			return
		}
		required, err := policy.PhoneVerificationRequired(c.Request.Context())
		if err != nil {
			phoneUnavailable(c)
			return
		}
		if required {
			verified, err := identity.PhoneVerified(c.Request.Context(), id)
			if err != nil {
				phoneUnavailable(c)
				return
			}
			if !verified {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"code": "PHONE_VERIFICATION_REQUIRED", "error": "برای ادامه، شماره تلفن حساب تلگرام خود را به اشتراک بگذارید."})
				return
			}
		}
		c.Next()
	}
}

func phoneUnavailable(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"code": "PHONE_VERIFICATION_UNAVAILABLE", "error": "بررسی دسترسی موقتاً امکان‌پذیر نیست. دوباره تلاش کنید."})
}
