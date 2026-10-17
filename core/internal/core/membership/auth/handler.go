package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Handler exposes authentication HTTP endpoints.
type Handler struct {
	service *Service
	limits  *attemptLimiter
}

// NewHandler creates a new auth handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service, limits: newAttemptLimiter()}
}

// Login handles POST /api/v1/auth/login
func (h *Handler) Login(c *gin.Context) {
	if !h.allow(c, "ip:"+c.RemoteIP(), 60) {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16384)
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.allow(c, "user:"+strings.ToLower(strings.TrimSpace(req.Username)), 10) {
		return
	}

	resp, err := h.service.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Refresh handles POST /api/v1/auth/refresh
func (h *Handler) Refresh(c *gin.Context) {
	if !h.allow(c, "refresh:"+c.RemoteIP(), 120) {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16384)
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) Logout(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16384)
	var req RefreshRequest
	if c.ShouldBindJSON(&req) != nil || h.service.Logout(c.Request.Context(), req.RefreshToken) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	c.Status(http.StatusNoContent)
}
func (h *Handler) allow(c *gin.Context, key string, max int) bool {
	if h.limits.allow(key, max) {
		return true
	}
	c.Header("Retry-After", "900")
	c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many attempts; try again later"})
	return false
}
