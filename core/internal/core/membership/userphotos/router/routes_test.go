package router

import (
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"net/url"
	"telegram-marketplace/internal/app/middleware"
	"testing"
)

func TestGalleryAndSyncAreAdminOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, signedIn := range []bool{false, true} {
		router := gin.New()
		group := router.Group("/api/v1")
		if signedIn {
			group.Use(func(c *gin.Context) { c.Set(middleware.InitDataKey, url.Values{"user": {`{"id":42}`}}); c.Next() })
		}
		// A nil handler also verifies the guards abort before domain logic executes.
		RegisterRoutes(group, nil)
		for _, endpoint := range []struct{ method, path string }{{"GET", "/api/v1/user/11111111-1111-1111-1111-111111111111/photos"}, {"POST", "/api/v1/user/11111111-1111-1111-1111-111111111111/photos/sync"}} {
			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest(endpoint.method, endpoint.path, nil))
			if response.Code != 403 {
				t.Fatalf("signedIn=%v: %s allowed: %d", signedIn, endpoint.path, response.Code)
			}
		}
	}
}
