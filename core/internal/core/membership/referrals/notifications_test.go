package referrals

import (
	"context"
	"errors"
	"telegram-marketplace/internal/core/membership/referrals/model"
	"telegram-marketplace/internal/core/membership/referrals/repository"
	"telegram-marketplace/internal/platform/telegram"
	"testing"
)

type notificationRepo struct {
	repository.Repository
	queue    []*model.Notification
	outcomes []string
	delays   []int
}

func (r *notificationRepo) ClaimNotification(context.Context) (*model.Notification, error) {
	if len(r.queue) == 0 {
		return nil, nil
	}
	n := r.queue[0]
	r.queue = r.queue[1:]
	return n, nil
}
func (r *notificationRepo) FinishNotification(ctx context.Context, id, token, outcome string, delay int) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if token != "lease" {
		return errors.New("invalid lease")
	}
	r.outcomes = append(r.outcomes, outcome)
	r.delays = append(r.delays, delay)
	return nil
}

type messageBot struct {
	errors   []error
	messages []string
	chats    []int64
}

func (b *messageBot) BotUsername(context.Context) (string, error) { return "test_bot", nil }
func (b *messageBot) SendMessage(_ context.Context, chat int64, message string) error {
	b.messages = append(b.messages, message)
	b.chats = append(b.chats, chat)
	err := b.errors[0]
	b.errors = b.errors[1:]
	return err
}
func TestDispatchIndependentRecipientsAndRetries(t *testing.T) {
	r := &notificationRepo{}
	for i := 0; i < 5; i++ {
		r.queue = append(r.queue, &model.Notification{ID: "id", ChatID: int64(42 + i), Message: "credit received", Attempts: 1, LeaseToken: "lease"})
	}
	b := &messageBot{errors: []error{nil, errors.New("network timeout"), &telegram.APIError{Code: 403}, &telegram.APIError{Code: 429}, &telegram.APIError{Code: 400}}}
	if err := NewService(r, b).DispatchNotifications(context.Background()); err != nil {
		t.Fatal(err)
	}
	want := []string{"sent", "retry", "failed", "retry", "failed"}
	for i, value := range want {
		if r.outcomes[i] != value {
			t.Fatalf("outcomes: %v", r.outcomes)
		}
	}
	if r.delays[1] != 60 || r.delays[3] != 60 || len(b.messages) != 5 {
		t.Fatalf("retry: %v", r.delays)
	}
	if err := NewService(r, b).DispatchNotifications(context.Background()); err != nil || len(b.messages) != 5 {
		t.Fatal("drained messages resent")
	}
}
func TestCancelledDispatchDoesNotClaim(t *testing.T) {
	r := &notificationRepo{queue: []*model.Notification{{ID: "pending"}}}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := NewService(r, &messageBot{}).DispatchNotifications(ctx); !errors.Is(err, context.Canceled) || len(r.queue) != 1 {
		t.Fatal("cancelled worker consumed message", err)
	}
}
