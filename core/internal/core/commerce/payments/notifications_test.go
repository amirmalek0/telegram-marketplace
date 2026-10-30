package payments

import (
	"context"
	"errors"
	"telegram-marketplace/internal/core/commerce/payments/model"
	"telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/internal/platform/telegram"
	"testing"
)

type reviewNotificationRepo struct {
	repository.Repository
	queue    []*model.ReviewNotification
	outcomes []string
	delays   []int
}

func (r *reviewNotificationRepo) ClaimReviewNotification(context.Context) (*model.ReviewNotification, error) {
	if len(r.queue) == 0 {
		return nil, nil
	}
	n := r.queue[0]
	r.queue = r.queue[1:]
	return n, nil
}
func (r *reviewNotificationRepo) FinishReviewNotification(ctx context.Context, id, token, outcome string, delay int) error {
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if token != "lease" {
		return errors.New("bad lease")
	}
	r.outcomes = append(r.outcomes, outcome)
	r.delays = append(r.delays, delay)
	return nil
}

type reviewSender struct {
	errors []error
	chats  []int64
}

func (s *reviewSender) SendMessage(_ context.Context, chat int64, _ string) error {
	s.chats = append(s.chats, chat)
	err := s.errors[0]
	s.errors = s.errors[1:]
	return err
}

func TestReviewNotificationRetriesAndPermanentFailures(t *testing.T) {
	r := &reviewNotificationRepo{}
	for i := 0; i < 5; i++ {
		r.queue = append(r.queue, &model.ReviewNotification{ID: "job", ChatID: int64(40 + i), Message: "result", Attempts: 1, LeaseToken: "lease"})
	}
	b := &reviewSender{errors: []error{nil, errors.New("network"), &telegram.APIError{Code: 429}, &telegram.APIError{Code: 403}, &telegram.APIError{Code: 400}}}
	s := NewService(r, nil, nil, nil)
	s.SetReviewNotificationSender(b)
	if err := s.DispatchReviewNotifications(context.Background()); err != nil {
		t.Fatal(err)
	}
	for i, want := range []string{"sent", "retry", "retry", "failed", "failed"} {
		if r.outcomes[i] != want {
			t.Fatal(r.outcomes)
		}
	}
	if r.delays[1] != 60 || r.delays[2] != 60 {
		t.Fatal(r.delays)
	}
	if err := s.DispatchReviewNotifications(context.Background()); err != nil || len(b.chats) != 5 {
		t.Fatal("drained queue resent", err)
	}
}
func TestReviewNotificationCancellation(t *testing.T) {
	r := &reviewNotificationRepo{queue: []*model.ReviewNotification{{ID: "pending"}}}
	s := NewService(r, nil, nil, nil)
	s.SetReviewNotificationSender(&reviewSender{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := s.DispatchReviewNotifications(ctx); !errors.Is(err, context.Canceled) || len(r.queue) != 1 {
		t.Fatal(err)
	}
}
