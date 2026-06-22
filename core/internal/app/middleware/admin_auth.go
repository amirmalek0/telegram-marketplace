package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"telegram-marketplace/internal/core/membership/auth"
)

const (
	// AdminClaimsKey is the gin context key for validated admin JWT claims.
	AdminClaimsKey = "admin_claims"
)

// AdminAuth returns a Gin middleware that validates JWT Bearer tokens
// for backoffice admin routes.
func AdminAuth(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing Authorization header"})
			return
		}

		const prefix = "Bearer "
		if !strings.HasPrefix(authHeader, prefix) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid scheme, expected Bearer"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, prefix)
		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		// Store claims in context for downstream handlers
		c.Set(AdminClaimsKey, claims)
		c.Next()
	}
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
