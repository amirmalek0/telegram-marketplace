package router

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"telegram-marketplace/internal/core/membership/users"
	usermodel "telegram-marketplace/internal/core/membership/users/model"
	userrepo "telegram-marketplace/internal/core/membership/users/repository"
	"telegram-marketplace/internal/core/settings"
	settingsrepo "telegram-marketplace/internal/core/settings/repository"
	"testing"
	"time"
)

type gateSettingsRepo struct {
	settingsrepo.Repository
	required bool
}

func (r *gateSettingsRepo) PhoneVerificationRequired(context.Context) (bool, error) {
	return r.required, nil
}

type gateUsersRepo struct {
	userrepo.Repository
	verified bool
	saved    *usermodel.User
}

func (r *gateUsersRepo) PhoneVerified(context.Context, int64) (bool, error) { return r.verified, nil }
func (r *gateUsersRepo) UpsertProfile(_ context.Context, u *usermodel.User) (bool, error) {
	u.ID = "self"
	r.saved = u
	return true, nil
}
func (r *gateUsersRepo) GetByID(context.Context, string) (*usermodel.User, error) {
	return r.saved, nil
}
func (r *gateUsersRepo) GetByTelegramID(context.Context, int64) (*usermodel.User, error) {
	return &usermodel.User{TelegramID: 42}, nil
}

func signedHeader() string {
	user := `{"id":42,"first_name":"Test"}`
	secret := hmac.New(sha256.New, []byte("WebAppData"))
	secret.Write([]byte("test-token"))
	hash := hmac.New(sha256.New, secret.Sum(nil))
	date := strconv.FormatInt(time.Now().Unix(), 10)
	hash.Write([]byte("auth_date=" + date + "\nuser=" + user))
	return "tma " + url.Values{"auth_date": {date}, "user": {user}, "hash": {hex.EncodeToString(hash.Sum(nil))}}.Encode()
}

func TestAllDomainRoutesBlockedAndBootstrapRemainsAvailable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	settingsRepo := &gateSettingsRepo{required: true}
	usersRepo := &gateUsersRepo{}
	policy := settings.NewService(settingsRepo)
	identity := users.NewService(usersRepo)
	r := New("test-token", nil, Handlers{SettingsService: policy, UsersService: identity, Users: users.NewHandler(identity, policy)})
	for _, route := range r.Routes() {
		if route.Path == "/health" || strings.HasPrefix(route.Path, "/api/v1/auth/") || route.Path == "/api/v1/miniapp-content" || route.Path == "/api/v1/user/phone-verification" || (route.Path == "/api/v1/user" && route.Method == "POST") {
			continue
		}
		path := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(route.Path, ":id", "sample"), ":user_id", "sample"), ":key", "sample")
		t.Run(route.Method+" "+path, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := httptest.NewRequest(route.Method, path, nil)
			req.Header.Set("Authorization", signedHeader())
			r.ServeHTTP(w, req)
			if w.Code != 403 || !strings.Contains(w.Body.String(), "PHONE_VERIFICATION_REQUIRED") {
				t.Fatalf("route not gated: %d %s", w.Code, w.Body.String())
			}
		})
	}
	request := func(method, path string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, nil)
		req.Header.Set("Authorization", signedHeader())
		r.ServeHTTP(w, req)
		return w
	}
	if w := request("GET", "/api/v1/user/phone-verification"); w.Code != 200 || !strings.Contains(w.Body.String(), `"verified":false`) {
		t.Fatalf("status blocked: %s", w.Body.String())
	}
	if w := request("POST", "/api/v1/user"); w.Code != 201 {
		t.Fatalf("bootstrap blocked: %s", w.Body.String())
	}
	usersRepo.verified = true
	if w := request("GET", "/api/v1/user/me"); w.Code != 200 {
		t.Fatalf("verified user blocked: %s", w.Body.String())
	}
	usersRepo.verified = false
	settingsRepo.required = false
	if w := request("GET", "/api/v1/user/me"); w.Code != 200 {
		t.Fatalf("disabled gate blocked user: %s", w.Body.String())
	}
	settingsRepo.required = true
	if w := request("GET", "/api/v1/user/me"); w.Code != 403 {
		t.Fatal("live setting change was not enforced")
	}
}
