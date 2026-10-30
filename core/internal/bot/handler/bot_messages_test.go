package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"telegram-marketplace/internal/app/router"
	"telegram-marketplace/internal/core/botmessages"
	"telegram-marketplace/internal/core/botmessages/model"
	"telegram-marketplace/internal/platform/telegram"
	"testing"
)

type messageConfigRepo struct{ config model.Config }

func (r messageConfigRepo) Load(context.Context) (model.Config, map[string]string, error) {
	return r.config, nil, nil
}
func (r messageConfigRepo) Save(context.Context, model.Config, string) (model.Config, error) {
	return r.config, nil
}

func TestCustomCallbacksArePrivateAndCannotTriggerFinancialNotifications(t *testing.T) {
	ctx := context.Background()
	var sent []map[string]any
	var answers int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "answerCallbackQuery") {
			answers++
			w.Write([]byte("{\"ok\":true,\"result\":true}"))
			return
		}
		var payload map[string]any
		json.NewDecoder(r.Body).Decode(&payload)
		sent = append(sent, payload)
		w.Write([]byte("{\"ok\":true,\"result\":{\"message_id\":1}}"))
	}))
	defer server.Close()
	client := telegram.NewTestClient("test", server.URL, server.Client())
	config := model.Defaults()
	config.Messages = append(config.Messages, model.Template{Key: "custom.help", Name: "Help", Text: "سلام {first_name}", Format: "plain", Enabled: true, Rows: [][]model.Button{}})
	h := &Handler{telegram: client, services: router.Handlers{BotMessagesService: botmessages.NewService(messageConfigRepo{config}, client)}}
	callback := &telegram.CallbackQuery{ID: "q", From: telegram.User{ID: 42, FirstName: "Amir"}, Message: &telegram.Message{Chat: telegram.Chat{ID: 42, Type: "private"}}, Data: "bm:custom.help"}
	if err := h.processUpdate(ctx, telegram.Update{CallbackQuery: callback}); err != nil || len(sent) != 1 || sent[0]["text"] != "سلام Amir" {
		t.Fatal(err, sent)
	}
	callback.Data = "bm:manual.approved"
	if err := h.processUpdate(ctx, telegram.Update{CallbackQuery: callback}); err != nil || len(sent) != 1 {
		t.Fatal("forged success", err)
	}
	callback.Data = "bm:custom.help"
	callback.Message.Chat.ID = 99
	h.processUpdate(ctx, telegram.Update{CallbackQuery: callback})
	callback.Message.Chat.ID = 42
	callback.Message.Chat.Type = "group"
	h.processUpdate(ctx, telegram.Update{CallbackQuery: callback})
	if len(sent) != 1 || answers != 4 {
		t.Fatal("foreign chat served", sent, answers)
	}
	callback.Message.Chat.Type = "private"
	callback.Data = "bm:verify"
	if err := h.processUpdate(ctx, telegram.Update{CallbackQuery: callback}); err != nil || len(sent) != 2 {
		t.Fatal(err)
	}
	markup, _ := json.Marshal(sent[1]["reply_markup"])
	if !strings.Contains(string(markup), "request_contact") {
		t.Fatal("verify button bypassed user consent")
	}
}
