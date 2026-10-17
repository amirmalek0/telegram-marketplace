package referrals

import (
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"strings"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/auth"
	"testing"
)

func TestSettingsRequiresAllFieldsAndIntegerRewards(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		body   string
		status int
	}{
		{`{}`, 400},
		{`{"enabled":true,"inviter_stars":10,"reward_trigger":"bot_open"}`, 400},
		{`{"enabled":true,"inviter_stars":1.5,"invitee_stars":10,"reward_trigger":"bot_open"}`, 400},
		{`{"enabled":true,"inviter_stars":-1,"invitee_stars":10,"reward_trigger":"bot_open"}`, 400},
		{`{"enabled":true,"inviter_stars":10,"invitee_stars":10,"reward_trigger":"unknown"}`, 400},
		{`{"enabled":true,"inviter_stars":10,"invitee_stars":10,"reward_trigger":"bot_open","inviter_message":""}`, 400},
		{`{"enabled":true,"inviter_stars":10,"invitee_stars":10,"reward_trigger":"bot_open","invitee_message":"{amount}"}`, 400},
		{`{"enabled":true,"inviter_stars":10,"invitee_stars":10,"reward_trigger":"bot_open","inviter_message":"{amount} from {invitee_name}","invitee_message":"{amount} thanks to {inviter_name}"}`, 200},
		{`{"enabled":false,"inviter_stars":0,"invitee_stars":0,"reward_trigger":"bot_open"}`, 200},
	} {
		repo := &fakeRepo{}
		r := gin.New()
		r.PUT("/settings", func(c *gin.Context) { c.Set(middleware.AdminClaimsKey, &auth.Claims{AdminID: "admin"}) }, NewHandler(NewService(repo, nil)).UpdateSettings)
		w := httptest.NewRecorder()
		req := httptest.NewRequest("PUT", "/settings", strings.NewReader(tc.body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		if w.Code != tc.status || repo.saved != (tc.status == 200) {
			t.Fatalf("%s got %d %s", tc.body, w.Code, w.Body.String())
		}
	}
}
