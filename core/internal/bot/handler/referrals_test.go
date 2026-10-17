package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"telegram-marketplace/internal/app/router"
	"telegram-marketplace/internal/core/membership/referrals"
	referralrepo "telegram-marketplace/internal/core/membership/referrals/repository"
	"telegram-marketplace/internal/core/membership/users"
	"telegram-marketplace/internal/core/membership/users/model"
	userrepo "telegram-marketplace/internal/core/membership/users/repository"
	telegram "telegram-marketplace/internal/platform/telegram"
)

type startReferralRepo struct {
	referralrepo.Repository
	code  string
	tg    int64
	calls int
}

func (r *startReferralRepo) Onboard(_ context.Context, tg int64, _, _, _, code string) (string, bool, error) {
	r.tg = tg
	r.code = code
	r.calls++
	return "user", true, nil
}
func (r *startReferralRepo) Reward(context.Context, int64) error { return nil }

type startUserRepo struct{ userrepo.Repository }

func (r *startUserRepo) GetByID(context.Context, string) (*model.User, error) {
	return &model.User{ID: "user", TelegramID: 42}, nil
}

func TestPrivateBotStartAttributesInvitationAndShowsMiniapp(t *testing.T) {
	sent := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if strings.HasSuffix(r.URL.Path, "getChatMenuButton") {
			w.Write([]byte(`{"ok":true,"result":{"type":"web_app","web_app":{"url":"https://example.test"}}}`))
			return
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Error(err)
		}
		encoded, _ := json.Marshal(payload["reply_markup"])
		if !strings.Contains(string(encoded), `"web_app":{"url":"https://example.test"}`) {
			t.Error("configured menu URL missing")
		}
		sent = true
		w.Write([]byte(`{"ok":true,"result":{"message_id":1}}`))
	}))
	defer server.Close()
	client := telegram.NewTestClient("test", server.URL, server.Client())
	repo := &startReferralRepo{}
	service := referrals.NewService(repo, client)
	identity := users.NewService(&startUserRepo{})
	identity.SetReferralRewards(service)
	h := &Handler{telegram: client, services: router.Handlers{UsersService: identity, ReferralsService: service}}
	code := "0123456789abcdef0123456789abcdef"
	message := &telegram.Message{Text: "/start ref_" + code, From: &telegram.User{ID: 42}, Chat: telegram.Chat{ID: 42, Type: "private"}}
	if err := h.processUpdate(context.Background(), telegram.Update{Message: message}); err != nil || repo.tg != 42 || repo.code != code || !sent {
		t.Fatalf("start not attributed: %+v %v", repo, err)
	}
	for _, change := range []func(){func() { message.Chat.Type = "group" }, func() { message.Chat.Type = "private"; message.Chat.ID = 99 }, func() { message.Chat.ID = 42; message.ForwardOrigin = []byte(`{"type":"user"}`) }} {
		change()
		_ = h.processUpdate(context.Background(), telegram.Update{Message: message})
		if repo.calls != 1 {
			t.Fatal("untrusted start attributed")
		}
	}
}
