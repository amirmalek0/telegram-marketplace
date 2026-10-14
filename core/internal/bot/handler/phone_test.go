package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"telegram-marketplace/internal/app/router"
	"telegram-marketplace/internal/core/membership/users"
	"telegram-marketplace/internal/core/membership/users/model"
	"telegram-marketplace/internal/core/membership/users/repository"
	telegram "telegram-marketplace/internal/platform/telegram"
	"testing"
)

type contactRepo struct {
	repository.Repository
	saved *model.User
}

func (r *contactRepo) VerifyPhone(_ context.Context, u *model.User) error { r.saved = u; return nil }

func TestBotContactUpdate(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ok":true,"result":{"message_id":1}}`))
	}))
	defer server.Close()
	repo := &contactRepo{}
	h := &Handler{telegram: telegram.NewTestClient("test", server.URL, server.Client()), services: router.Handlers{UsersService: users.NewService(repo)}}
	message := &telegram.Message{From: &telegram.User{ID: 42, FirstName: "Owner"}, Chat: telegram.Chat{ID: 42, Type: "private"}, Contact: &telegram.Contact{UserID: 99, PhoneNumber: "+989123456789"}}
	if err := h.processUpdate(context.Background(), telegram.Update{Message: message}); err != nil {
		t.Fatal(err)
	}
	if repo.saved != nil || calls != 0 {
		t.Fatal("another person's contact was accepted")
	}
	message.Contact.UserID = 42
	if err := h.processUpdate(context.Background(), telegram.Update{Message: message}); err != nil {
		t.Fatal(err)
	}
	if repo.saved == nil || repo.saved.TelegramID != 42 || calls != 1 {
		t.Fatal("own contact was not persisted and acknowledged")
	}
}

func TestWebhookRequiresSecret(t *testing.T) {
	if err := (&Handler{}).StartWebhook(":0", "https://example.invalid"); err == nil {
		t.Fatal("unsigned webhook would be accepted")
	}
}
