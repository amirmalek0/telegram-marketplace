package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequireAdmin returns a Gin middleware that rejects the request with 403
// unless valid admin JWT claims are present in the context.
// Must be used after OptionalAuth.
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if GetAdminClaims(c) == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			return
		}
		c.Next()
	}
}

// RequireTelegram returns a Gin middleware that rejects the request with 403
// unless valid Telegram Mini App initData is present in the context.
// Must be used after OptionalAuth.
func RequireTelegram() gin.HandlerFunc {
	return func(c *gin.Context) {
		if GetInitData(c) == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "telegram authentication required"})
			return
		}
		c.Next()
	}
}

// RequireAny returns a Gin middleware that rejects the request with 401
// unless at least one form of authentication (admin JWT or Telegram initData)
// is present in the context.
// Must be used after OptionalAuth.
func RequireAny() gin.HandlerFunc {
	return func(c *gin.Context) {
		if GetAdminClaims(c) == nil && GetInitData(c) == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		c.Next()
	}
}
