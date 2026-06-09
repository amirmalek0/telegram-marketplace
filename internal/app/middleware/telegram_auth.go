package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/url"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	// InitDataKey is the gin context key under which the validated
	// Telegram initData url.Values are stored after successful auth.
	InitDataKey = "telegram_init_data"
)

// TelegramAuth returns a Gin middleware that validates the Telegram Mini App
// initData sent in the Authorization header as:
//
//	Authorization: tma <url-encoded initData>
//
// Validation follows the official Telegram algorithm:
//  1. Parse initData as a URL query string.
//  2. Remove the "hash" field and collect the remaining key=value pairs.
//  3. Sort them alphabetically and join with "\n".
//  4. Compute HMAC-SHA256 of that string using a secret key derived as
//     HMAC-SHA256("WebAppData", botToken).
//  5. Compare the result (hex) with the hash field using constant-time comparison.
//
// On success the raw initData query values are stored in the context under
// InitDataKey so downstream handlers can read them via GetInitData.
func TelegramAuth(botToken string) gin.HandlerFunc {
	// Derive the secret key once at startup: HMAC-SHA256("WebAppData", botToken)
	mac := hmac.New(sha256.New, []byte("WebAppData"))
	mac.Write([]byte(botToken))
	secretKey := mac.Sum(nil)

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing Authorization header"})
			return
		}

		const prefix = "tma "
		if !strings.HasPrefix(authHeader, prefix) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid Authorization scheme, expected 'tma'"})
			return
		}

		rawInitData := strings.TrimPrefix(authHeader, prefix)

		params, err := url.ParseQuery(rawInitData)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "malformed initData"})
			return
		}

		receivedHash := params.Get("hash")
		if receivedHash == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing hash in initData"})
			return
		}

		// Build the data-check string: sorted key=value pairs (excluding hash), joined by \n
		var parts []string
		for key, values := range params {
			if key == "hash" {
				continue
			}
			parts = append(parts, key+"="+values[0])
		}
		sort.Strings(parts)
		dataCheckString := strings.Join(parts, "\n")

		// Compute expected HMAC-SHA256
		h := hmac.New(sha256.New, secretKey)
		h.Write([]byte(dataCheckString))
		expectedHash := hex.EncodeToString(h.Sum(nil))

		if !hmac.Equal([]byte(expectedHash), []byte(receivedHash)) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid initData signature"})
			return
		}

		c.Set(InitDataKey, params)
		c.Next()
	}
}

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
