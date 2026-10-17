package router

import (
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"net/url"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/auth"
	"testing"
)

func TestReferralRoleGuards(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct{ role, method, path string }{{"telegram", "GET", "/settings/referrals"}, {"telegram", "PUT", "/settings/referrals"}, {"admin", "GET", "/referral/me"}, {"anonymous", "GET", "/referral/me"}} {
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
				t.Fatal("role guard failed", w.Code)
			}
		})
	}
}
