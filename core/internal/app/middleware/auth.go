package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"telegram-marketplace/internal/core/membership/auth"
)

const (
	// InitDataKey is the gin context key under which the validated
	// Telegram initData url.Values are stored after successful auth.
	InitDataKey = "telegram_init_data"

	// AdminClaimsKey is the gin context key for validated admin JWT claims.
	AdminClaimsKey = "admin_claims"

	// authorizationHeader is the standard HTTP header name for credentials.
	authorizationHeader = "Authorization"

	// tmaSchemePrefix is the Authorization header prefix for Telegram Mini App initData.
	tmaSchemePrefix = "tma "

	// bearerSchemePrefix is the Authorization header prefix for JWT Bearer tokens.
	bearerSchemePrefix = "Bearer "

	// tmaHMACSalt is the HMAC-SHA256 salt used to derive the TMA secret key.
	tmaHMACSalt = "WebAppData"

	// tmaHashParam is the query parameter name containing the Telegram initData hash.
	tmaHashParam = "hash"

	// errorKey is the JSON key used in error response bodies.
	errorKey = "error"

	// errAuthenticationRequired is the error message returned when auth is missing or invalid.
	errAuthenticationRequired = "authentication required"
)

// GetInitData retrieves the validated Telegram initData params from the context.
// Returns nil if the middleware was not applied or auth failed.
func GetInitData(c *gin.Context) url.Values {
	v, exists := c.Get(InitDataKey)
	if !exists {
		return nil
	}
	params, _ := v.(url.Values)
	return params
}

// GetAdminClaims retrieves the validated admin claims from the context.
// Returns nil if the middleware was not applied or auth failed.
func GetAdminClaims(c *gin.Context) *auth.Claims {
	v, exists := c.Get(AdminClaimsKey)
	if !exists {
		return nil
	}
	return v.(*auth.Claims)
}

// Auth returns a Gin middleware that authenticates the request using either
// Telegram Mini App initData (scheme "tma") or a JWT Bearer token.
// Returns 401 Unauthorized if no valid credentials are provided.
// Downstream guard middlewares (RequireAdmin, RequireTelegram) enforce
// role-specific access control per route.
func Auth(botToken string, authService *auth.Service) gin.HandlerFunc {
	// Pre-derive the TMA secret key once at startup.
	mac := hmac.New(sha256.New, []byte(tmaHMACSalt))
	mac.Write([]byte(botToken))
	tmaSecretKey := mac.Sum(nil)

	return func(c *gin.Context) {
		authHeader := c.GetHeader(authorizationHeader)
		if authHeader == "" || len(authHeader) > 16384 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{errorKey: errAuthenticationRequired})
			return
		}

		switch {
		case strings.HasPrefix(authHeader, tmaSchemePrefix):
			TelegramAuth(c, strings.TrimPrefix(authHeader, tmaSchemePrefix), tmaSecretKey)

		case strings.HasPrefix(authHeader, bearerSchemePrefix):
			AdminAuth(c, strings.TrimPrefix(authHeader, bearerSchemePrefix), authService)

		default:
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{errorKey: errAuthenticationRequired})
			return
		}

		// If neither auth method set identity in the context, validation failed.
		if GetInitData(c) == nil && GetAdminClaims(c) == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{errorKey: errAuthenticationRequired})
			return
		}

		c.Next()
	}
}

// TelegramAuth validates Telegram Mini App initData and stores the
// parsed params in the context under InitDataKey on success.
// Returns without setting context on any validation failure.
func TelegramAuth(c *gin.Context, rawInitData string, secretKey []byte) {
	params, err := url.ParseQuery(rawInitData)
	if err != nil {
		return
	}

	receivedHash := params.Get(tmaHashParam)
	if receivedHash == "" {
		return
	}

	// Build the data-check string: sorted key=value pairs (excluding hash), joined by \n.
	var parts []string
	for key, values := range params {
		if len(values) != 1 {
			return
		}
		if key == tmaHashParam {
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

	// Telegram signs auth_date, but signature validity alone does not expire it.
	seconds, err := strconv.ParseInt(params.Get("auth_date"), 10, 64)
	if err != nil || seconds <= 0 {
		return
	}
	issued := time.Unix(seconds, 0)
	now := time.Now()
	if issued.After(now.Add(time.Minute)) || issued.Before(now.Add(-time.Hour)) {
		return
	}

	c.Set(InitDataKey, params)
}

// AdminAuth validates a JWT token and stores the claims in the context
// under AdminClaimsKey on success. Returns without setting context on failure.
func AdminAuth(c *gin.Context, tokenString string, authService *auth.Service) {
	if authService == nil {
		return
	}
	claims, err := authService.ValidateAccessToken(c.Request.Context(), tokenString)
	if err != nil {
		return
	}
	c.Set(AdminClaimsKey, claims)
}
