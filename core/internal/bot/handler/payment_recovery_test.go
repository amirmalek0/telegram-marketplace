package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"telegram-marketplace/internal/app/router"
	botrepo "telegram-marketplace/internal/bot/repository"
	"telegram-marketplace/internal/core/commerce/payments"
	paymentrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	telegram "telegram-marketplace/internal/platform/telegram"
	"testing"
)

type recoveryPaymentRepo struct {
	paymentrepo.Repository
	err      error
	refunded bool
	calls    int
}

func (r *recoveryPaymentRepo) SettleStarsPayment(context.Context, paymentrepo.SettlementInput) (*paymentrepo.SettlementResult, error) {
	r.calls++
	return nil, r.err
}

type queueStub struct {
	botrepo.Queue
	err            error
	enqueued, done int
}

func (q *queueStub) Enqueue(context.Context, telegram.Update) error { q.enqueued++; return q.err }
func (q *queueStub) Done(context.Context, int64) error              { q.done++; return nil }
func TestFinancialUpdatesDurableBeforeProcessing(t *testing.T) {
	ctx := context.Background()
	repo := &recoveryPaymentRepo{err: errors.New("temporary database failure")}
	queue := &queueStub{err: errors.New("queue unavailable")}
	h := &Handler{queue: queue, services: router.Handlers{PaymentsService: payments.NewService(repo, nil, nil, nil)}}
	update := telegram.Update{UpdateID: 12, Message: &telegram.Message{From: &telegram.User{ID: 42}, Chat: telegram.Chat{ID: 42}, SuccessfulPayment: &telegram.SuccessfulPayment{Currency: "XTR", TotalAmount: 20, TelegramPaymentChargeID: "charge"}}}
	if err := h.handleUpdate(ctx, update); err == nil || repo.calls != 0 {
		t.Fatal("processed without durable evidence")
	}
	queue.err = nil
	if err := h.handleUpdate(ctx, update); err != nil || repo.calls != 1 || queue.done != 0 {
		t.Fatal("temporary failure blocks bot or discarded", err)
	}
	// An unrelated subsequent update is still handled while the failed payment
	// remains queued for independent retries.
	if err := h.handleUpdate(ctx, telegram.Update{UpdateID: 13}); err != nil {
		t.Fatal(err)
	}
}
func (r *recoveryPaymentRepo) RecordRefund(context.Context, string, string, int64) error {
	r.refunded = true
	return nil
}
func (r *recoveryPaymentRepo) PrepareRefund(context.Context, string, string, int64) error { return nil }
func TestExpiredPaidCheckoutRefundedButTransientErrorsRetried(t *testing.T) {
	for _, transient := range []bool{false, true} {
		t.Run(map[bool]string{false: "expired", true: "transient"}[transient], func(t *testing.T) {
			refunds := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				if strings.HasSuffix(r.URL.Path, "/refundStarPayment") {
					refunds++
					w.Write([]byte(`{"ok":true,"result":true}`))
					return
				}
				w.Write([]byte(`{"ok":true,"result":{"message_id":1}}`))
			}))
			defer server.Close()
			repo := &recoveryPaymentRepo{err: payments.ErrInvalidCheckout}
			if transient {
				repo.err = errors.New("database unavailable")
			}
			h := &Handler{telegram: telegram.NewTestClient("test", server.URL, server.Client()), services: router.Handlers{PaymentsService: payments.NewService(repo, nil, nil, nil)}}
			u := telegram.Update{Message: &telegram.Message{From: &telegram.User{ID: 42}, Chat: telegram.Chat{ID: 42, Type: "private"}, SuccessfulPayment: &telegram.SuccessfulPayment{Currency: "XTR", TotalAmount: 20, InvoicePayload: "expired", TelegramPaymentChargeID: "paid-charge"}}}
			err := h.processUpdate(context.Background(), u)
			if transient {
				if err == nil || refunds != 0 || repo.refunded {
					t.Fatal("transient failure refunded", err)
				}
			} else {
				if err != nil || refunds != 1 || !repo.refunded {
					t.Fatal("payment lost", err)
				}
			}
		})
	}
}
