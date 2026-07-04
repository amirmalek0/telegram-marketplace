package middleware

import (
	"encoding/json"
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

// telegramUser represents the user data from Telegram initData.
type telegramUser struct {
	ID int64 `json:"id"`
}

// GetTelegramUserID extracts the Telegram user ID from the initData.
// Returns the user ID and true if successful, or 0 and false if not.
func GetTelegramUserID(c *gin.Context) (int64, bool) {
	initData := GetInitData(c)
	if initData == nil {
		return 0, false
	}

	userJSON := initData.Get("user")
	if userJSON == "" {
		return 0, false
	}

	var user telegramUser
	if err := json.Unmarshal([]byte(userJSON), &user); err != nil {
		return 0, false
	}

	if user.ID == 0 {
		return 0, false
	}

	return user.ID, true
}

// GetAdminID extracts the admin ID from the JWT claims.
// Returns the admin ID and true if successful, or empty string and false if not.
func GetAdminID(c *gin.Context) (string, bool) {
	claims := GetAdminClaims(c)
	if claims == nil {
		return "", false
	}
	return claims.AdminID, true
}
