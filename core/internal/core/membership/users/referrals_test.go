package users

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http/httptest"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/users/model"
)

type referralSpy struct {
	start string
	tg    int64
	calls int
}

func (s *referralSpy) Onboard(_ context.Context, tg int64, _, _, _, start string) (string, bool, error) {
	s.start = start
	s.tg = tg
	s.calls++
	return "self", true, nil
}
func (s *referralSpy) Check(context.Context, int64) {}

func TestReferralOnlyUsesSignedStartParameter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	spy := &referralSpy{}
	service := NewService(&phoneRepo{saved: &model.User{ID: "self", TelegramID: 42}})
	service.SetReferralRewards(spy)
	r := gin.New()
	r.POST("/user", middleware.Auth("test-token", nil), middleware.RequireTelegram(), NewHandler(service, nil).Save)
	params := url.Values{"user": {`{"id":42,"first_name":"Signed"}`}, "start_param": {"ref_0123456789abcdef0123456789abcdef"}}
	var lines []string
	params.Set("auth_date", strconv.FormatInt(time.Now().Unix(), 10))
	for key := range params {
		lines = append(lines, key+"="+params.Get(key))
	}
	sort.Strings(lines)
	secret := hmac.New(sha256.New, []byte("WebAppData"))
	secret.Write([]byte("test-token"))
	hash := hmac.New(sha256.New, secret.Sum(nil))
	hash.Write([]byte(strings.Join(lines, "\n")))
	params.Set("hash", hex.EncodeToString(hash.Sum(nil)))
	request := func() int {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/user?start_param=forged", strings.NewReader(`{"telegram_id":99,"referred_by":100,"start_param":"forged"}`))
		req.Header.Set("Authorization", "tma "+params.Encode())
		r.ServeHTTP(w, req)
		return w.Code
	}
	if code := request(); code != 201 || spy.start != params.Get("start_param") || spy.tg != 42 {
		t.Fatalf("untrusted attribution: %d %+v", code, spy)
	}
	params.Set("start_param", "tampered")
	if code := request(); code != 401 || spy.calls != 1 {
		t.Fatal("tampered signed payload accepted", code)
	}
}
