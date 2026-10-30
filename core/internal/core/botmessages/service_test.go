package botmessages

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"telegram-marketplace/internal/core/botmessages/model"
	"testing"
)

type memoryRepo struct {
	value  model.Config
	legacy map[string]string
	err    error
}

func (r *memoryRepo) Load(context.Context) (model.Config, map[string]string, error) {
	return r.value, r.legacy, r.err
}
func (r *memoryRepo) Save(_ context.Context, c model.Config, _ string) (model.Config, error) {
	if c.Revision != r.value.Revision {
		return c, model.ErrConflict
	}
	c.Revision++
	r.value = c
	return c, nil
}

type fakeSender struct {
	text, format, base string
	markup             any
	calls              int
}

func (f *fakeSender) SendFormattedMessage(_ context.Context, _ int64, text, format string, markup any) error {
	f.text = text
	f.format = format
	f.markup = markup
	f.calls++
	return nil
}
func (f *fakeSender) MiniAppURL(context.Context, int64) (string, error) { return f.base, nil }
func TestPersistenceLegacyAndConflict(t *testing.T) {
	ctx := context.Background()
	r := &memoryRepo{legacy: map[string]string{"referral.inviter": "legacy {amount} {invitee_name}"}}
	s := NewService(r, &fakeSender{})
	view, err := s.Load(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if view.Messages[7].Text != r.legacy["referral.inviter"] {
		t.Fatal("lost legacy template")
	}
	original := view.Config
	view.Messages[7].Text = "new {amount}"
	saved, err := s.Save(ctx, view.Config, "admin")
	if err != nil || saved.Revision != 1 {
		t.Fatal(err)
	}
	if _, err = s.Save(ctx, original, "admin"); !errors.Is(err, model.ErrConflict) {
		t.Fatal("stale save accepted", err)
	}
	reloaded, err := s.Load(ctx)
	if err != nil || reloaded.Messages[7].Text != "new {amount}" {
		t.Fatal("override lost")
	}
}
func TestStructuredMessagesAndFallback(t *testing.T) {
	ctx := context.Background()
	r := &memoryRepo{value: model.Defaults()}
	f := &fakeSender{base: "https://shop.example/base?launch=1"}
	s := NewService(r, f)
	r.value.Messages[0].Text = "<b>{user_name}</b>"
	r.value.Messages[0].Format = "HTML"
	r.value.Messages[0].Rows = [][]model.Button{
		{{Text: "VIP", Action: "miniapp", Value: "/vip", Style: "success"}, {Text: "راهنما", Action: "message", Value: "custom.help", Style: "primary"}},
		{{Text: "کپی", Action: "copy", Value: "code"}, {Text: "شماره", Action: "verify", Style: "danger"}},
	}
	if err := s.Send(ctx, 42, "start", map[string]string{"user_name": "<admin>"}); err != nil {
		t.Fatal(err)
	}
	data, _ := json.Marshal(f.markup)
	for _, want := range []string{"https://shop.example/vip", "bm:custom.help", "bm:verify", "copy_text", "success", "primary", "danger"} {
		if !strings.Contains(string(data), want) {
			t.Fatal(string(data), want)
		}
	}
	if f.text != "<b>&lt;admin&gt;</b>" || f.format != "HTML" {
		t.Fatal(f)
	}
	if err := s.Send(ctx, 42, "phone.request", nil); err != nil {
		t.Fatal(err)
	}
	data, _ = json.Marshal(f.markup)
	if !strings.Contains(string(data), "request_contact") {
		t.Fatal("lost contact button")
	}
	if err := s.SendNotification(ctx, 42, "referral.inviter", "old queued <plain>", nil); err != nil || f.text != "old queued <plain>" || f.format != "plain" {
		t.Fatal("legacy queue changed", err)
	}
	r.value.Messages[0].Enabled = false
	calls := f.calls
	if err := s.Send(ctx, 42, "start", nil); err != nil || f.calls != calls {
		t.Fatal("disabled message sent")
	}
	r.err = errors.New("database down")
	if got := s.Text(ctx, "checkout.invalid", nil); got == "" {
		t.Fatal("no critical default on failure")
	}
}
func TestManualNoticeCannotHideOutcome(t *testing.T) {
	r := &memoryRepo{value: model.Defaults()}
	f := &fakeSender{}
	s := NewService(r, f)
	r.value.Messages[10].Text = "سلام"
	r.value.Messages[10].Format = "HTML"
	vars := map[string]string{"status": "رد شد", "test_notice": "آزمایشی", "reason": "<bad>"}
	if err := s.SendNotification(context.Background(), 42, "manual.rejected", "", vars); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"رد شد", "آزمایشی", "&lt;bad&gt;"} {
		if !strings.Contains(f.text, want) {
			t.Fatal(f.text)
		}
	}
}
