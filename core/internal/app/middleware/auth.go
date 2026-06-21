package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/url"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"

	"telegram-marketplace/internal/core/membership/admins"
)

// OptionalAuth returns a Gin middleware that attempts to authenticate the
// request using either Telegram Mini App initData (scheme "tma") or a
// JWT Bearer token. It never rejects — if neither scheme is present or
// validation fails, the request continues with no identity in the context.
// Downstream guard middlewares (RequireAdmin, RequireTelegram, RequireAny)
// enforce access control per route.
func OptionalAuth(botToken string, adminService *admins.Service) gin.HandlerFunc {
	// Pre-derive the TMA secret key once at startup.
	mac := hmac.New(sha256.New, []byte("WebAppData"))
	mac.Write([]byte(botToken))
	tmaSecretKey := mac.Sum(nil)

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		switch {
		case strings.HasPrefix(authHeader, "tma "):
			tryTelegramAuth(c, strings.TrimPrefix(authHeader, "tma "), tmaSecretKey)

		case strings.HasPrefix(authHeader, "Bearer "):
			tryAdminAuth(c, strings.TrimPrefix(authHeader, "Bearer "), adminService)
		}

		c.Next()
	}
}

// tryTelegramAuth validates Telegram Mini App initData and stores the
// parsed params in the context under InitDataKey on success.
// Silently returns on any validation failure (non-rejecting).
func tryTelegramAuth(c *gin.Context, rawInitData string, secretKey []byte) {
	params, err := url.ParseQuery(rawInitData)
	if err != nil {
		return
	}

	receivedHash := params.Get("hash")
	if receivedHash == "" {
		return
	}

	// Build the data-check string: sorted key=value pairs (excluding hash), joined by \n.
	var parts []string
	for key, values := range params {
		if key == "hash" {
			continue
		}
		parts = append(parts, key+"="+values[0])
	}
	sort.Strings(parts)
	dataCheckString := strings.Join(parts, "\n")

	// Compute expected HMAC-SHA256.
	h := hmac.New(sha256.New, secretKey)
	h.Write([]byte(dataCheckString))
	expectedHash := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(expectedHash), []byte(receivedHash)) {
		return
	}

	c.Set(InitDataKey, params)
}

// tryAdminAuth validates a JWT token and stores the claims in the context
// under AdminClaimsKey on success. Silently returns on failure (non-rejecting).
func tryAdminAuth(c *gin.Context, tokenString string, adminService *admins.Service) {
	claims, err := adminService.ValidateToken(tokenString)
	if err != nil {
		return
	}
	c.Set(AdminClaimsKey, claims)
}
