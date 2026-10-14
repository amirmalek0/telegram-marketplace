package users

import (
	"context"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"net/url"
	"strings"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/users/model"
	"telegram-marketplace/internal/core/membership/users/repository"
	"testing"
)

type phoneRepo struct {
	repository.Repository
	saved *model.User
	err   error
}

func (r *phoneRepo) VerifyPhone(_ context.Context, u *model.User) error { r.saved = u; return r.err }
func (r *phoneRepo) UpsertProfile(_ context.Context, u *model.User) (bool, error) {
	u.ID = "self"
	r.saved = u
	return true, r.err
}
func (r *phoneRepo) GetByID(context.Context, string) (*model.User, error) { return r.saved, r.err }

func TestVerifyContactOnlyTrustsOwnPrivateContact(t *testing.T) {
	valid := TelegramContact{SenderID: 42, ContactUserID: 42, ChatID: 42, Private: true, PhoneNumber: "989123456789"}
	for _, tc := range []struct {
		name   string
		change func(*TelegramContact)
	}{
		{"another user", func(c *TelegramContact) { c.ContactUserID = 43 }},
		{"missing contact ID", func(c *TelegramContact) { c.ContactUserID = 0 }},
		{"missing sender", func(c *TelegramContact) { c.SenderID = 0 }},
		{"group", func(c *TelegramContact) { c.Private = false }},
		{"other chat", func(c *TelegramContact) { c.ChatID = 43 }},
		{"forwarded", func(c *TelegramContact) { c.Forwarded = true }},
		{"empty phone", func(c *TelegramContact) { c.PhoneNumber = "" }},
		{"malformed phone", func(c *TelegramContact) { c.PhoneNumber = "not a phone" }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			input := valid
			tc.change(&input)
			repo := &phoneRepo{}
			if !errors.Is(NewService(repo).VerifyTelegramContact(context.Background(), input), ErrInvalidContact) {
				t.Fatal("invalid contact accepted")
			}
			if repo.saved != nil {
				t.Fatal("invalid contact persisted")
			}
		})
	}
	repo := &phoneRepo{}
	if err := NewService(repo).VerifyTelegramContact(context.Background(), valid); err != nil {
		t.Fatal(err)
	}
	if repo.saved.TelegramID != 42 || repo.saved.PhoneNumber != "+989123456789" {
		t.Fatal("wrong verified identity")
	}
	repo.err = errors.New("db down")
	if err := NewService(repo).VerifyTelegramContact(context.Background(), valid); err == nil {
		t.Fatal("persistence error hidden")
	}
}

func TestProfileCannotSpoofIdentityOrPhone(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &phoneRepo{}
	h := NewHandler(NewService(repo), nil)
	r := gin.New()
	r.POST("/user", func(c *gin.Context) {
		c.Set(middleware.InitDataKey, url.Values{"user": {`{"id":42,"first_name":"Signed","username":"signed"}`}})
	}, h.Save)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("POST", "/user", strings.NewReader(`{"telegram_id":999,"first_name":"Forged","phone_number":"+1234567890","phone_verified_at":"2026-01-01"}`)))
	if w.Code != 201 {
		t.Fatalf("%d: %s", w.Code, w.Body.String())
	}
	if repo.saved.TelegramID != 42 || repo.saved.FirstName != "Signed" || repo.saved.PhoneNumber != "" || repo.saved.PhoneVerifiedAt != nil {
		t.Fatal("untrusted profile fields used")
	}
	if strings.Contains(w.Body.String(), "wallet") || strings.Contains(w.Body.String(), "phone") {
		t.Fatal("onboarding leaked account data")
	}
}

func TestUserLookupRejectsOtherIdentity(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewHandler(NewService(&phoneRepo{}), nil)
	r.GET("/user/t/:id", func(c *gin.Context) { c.Set(middleware.InitDataKey, url.Values{"user": {`{"id":42}`}}) }, h.GetByTelegramID)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/user/t/43", nil))
	if w.Code != 403 {
		t.Fatalf("got %d", w.Code)
	}
}
