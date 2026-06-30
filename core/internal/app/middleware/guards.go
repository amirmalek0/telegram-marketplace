package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	// errAdminAccessRequired is the error message returned when admin auth is missing.
	errAdminAccessRequired = "admin access required"

	// errTelegramAuthRequired is the error message returned when Telegram auth is missing.
	errTelegramAuthRequired = "telegram authentication required"
)

// RequireAdmin returns a Gin middleware that rejects the request with 403
// unless valid admin JWT claims are present in the context.
// Must be used after Auth.
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if GetAdminClaims(c) == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{errorKey: errAdminAccessRequired})
			return
		}
		c.Next()
	}
}

// RequireTelegram returns a Gin middleware that rejects the request with 403
// unless valid Telegram Mini App initData is present in the context.
// Must be used after Auth.
func RequireTelegram() gin.HandlerFunc {
	return func(c *gin.Context) {
		if GetInitData(c) == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{errorKey: errTelegramAuthRequired})
			return
		}
		c.Next()
	}
}

// RequireAny returns a Gin middleware that rejects the request with 401
// unless at least one form of authentication (admin JWT or Telegram initData)
// is present in the context.
// Must be used after Auth.
func RequireAny() gin.HandlerFunc {
	return func(c *gin.Context) {
		if GetAdminClaims(c) == nil && GetInitData(c) == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{errorKey: errAuthenticationRequired})
			return
		}
		c.Next()
	}
}
