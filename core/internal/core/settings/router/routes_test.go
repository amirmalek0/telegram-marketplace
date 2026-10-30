package router

import (
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
)

func TestAssetUploadsAreAdminOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, signedIn := range []bool{false, true} {
		r := gin.New()
		group := r.Group("/api/v1")
		if signedIn {
			group.Use(func(c *gin.Context) { c.Set(middleware.InitDataKey, url.Values{"user": {`{"id":42}`}}); c.Next() })
		}
		RegisterAdminRoutes(group, nil)
		for _, path := range []string{"/api/v1/miniapp-images", "/api/v1/miniapp-logo"} {
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("POST", path, nil))
			if w.Code != 403 {
				t.Fatalf("signedIn=%v upload allowed: %d", signedIn, w.Code)
			}
		}
	}
}
