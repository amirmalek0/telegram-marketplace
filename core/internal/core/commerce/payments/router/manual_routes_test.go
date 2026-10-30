package router

import (
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"net/url"
	"telegram-marketplace/internal/app/middleware"
	"testing"
)

func TestManualAdminRoutesRejectCustomers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	group := r.Group("/api/v1", func(c *gin.Context) { c.Set(middleware.InitDataKey, url.Values{"user": {`{"id":42}`}}) })
	RegisterRoutes(group, nil)
	for _, req := range []struct{ method, path string }{{"GET", "/api/v1/payment/methods/config"}, {"PUT", "/api/v1/payment/methods"}} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(req.method, req.path, nil))
		if w.Code != 403 {
			t.Fatalf("policy route exposed: %s %d", req.path, w.Code)
		}
	}
	for _, req := range []struct{ method, path string }{{"GET", "config"}, {"PUT", "config"}, {"GET", "prices"}, {"PUT", "prices/product/10000000-0000-0000-0000-000000000001"}, {"POST", "bank"}, {"GET", "reviews"}, {"POST", "reviews/10000000-0000-0000-0000-000000000001"}, {"GET", "reviews/10000000-0000-0000-0000-000000000001/receipt"}} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(req.method, "/api/v1/payment/manual/"+req.path, nil))
		if w.Code != 403 {
			t.Fatalf("%s %s: %d", req.method, req.path, w.Code)
		}
	}
}
