package router

import (
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"telegram-marketplace/internal/core/botmessages"
	"testing"
)

func TestBotMessageRoutesRequireAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	RegisterRoutes(r.Group("/api/v1"), botmessages.NewHandler(nil))
	for _, method := range []string{"GET", "PUT"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(method, "/api/v1/settings/bot-messages", nil))
		if w.Code != 403 && w.Code != 401 {
			t.Fatalf("%s returned %d", method, w.Code)
		}
	}
}
