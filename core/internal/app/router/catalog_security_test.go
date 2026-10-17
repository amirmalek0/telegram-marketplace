package router

import (
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"telegram-marketplace/internal/core/membership/users"
	"telegram-marketplace/internal/core/settings"
	"testing"
)

func TestPrivateCatalogRejectsMiniappUsers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := New("test-token", nil, Handlers{
		SettingsService: settings.NewService(&gateSettingsRepo{}),
		UsersService:    users.NewService(&gateUsersRepo{}),
	})
	for _, path := range []string{"/file", "/file/id", "/message", "/message/id", "/inventory", "/inventory/id", "/inventory/id/item", "/bundle", "/bundle/id", "/api", "/api/id"} {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/v1"+path, nil)
		req.Header.Set("Authorization", signedHeader())
		r.ServeHTTP(w, req)
		if w.Code != 403 {
			t.Fatalf("%s leaked: %d %s", path, w.Code, w.Body.String())
		}
	}
}
