package router

import (
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/auth"
)

func TestBroadcastRoleGuards(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct{ role, method, path string }{
		{"telegram", "GET", "/broadcast"}, {"telegram", "POST", "/broadcast"}, {"telegram", "DELETE", "/broadcast/any"},
		{"admin", "GET", "/notification"}, {"admin", "GET", "/notification/unread-count"}, {"admin", "POST", "/notification/read-all"}, {"admin", "POST", "/notification/any/read"},
		{"anonymous", "POST", "/broadcast"}, {"anonymous", "GET", "/notification"},
	} {
		t.Run(tc.role+tc.method+tc.path, func(t *testing.T) {
			r := gin.New()
			group := r.Group("", func(c *gin.Context) {
				if tc.role == "telegram" {
					c.Set(middleware.InitDataKey, url.Values{"user": {`{"id":42}`}})
				}
				if tc.role == "admin" {
					c.Set(middleware.AdminClaimsKey, &auth.Claims{AdminID: "admin"})
				}
			})
			RegisterRoutes(group, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(tc.method, tc.path, nil))
			if w.Code != 403 {
				t.Fatalf("expected 403, got %d", w.Code)
			}
		})
	}
}
