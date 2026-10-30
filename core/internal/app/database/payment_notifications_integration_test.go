package database

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"strings"
	"sync"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	broadcastrepo "telegram-marketplace/internal/core/membership/broadcasts/repository"
	"testing"
)

func testPaymentReviewNotifications(t *testing.T, ctx context.Context, db *pgxpool.Pool, user, admin, pack string) {
	t.Run("private review inbox and durable bot outbox", func(t *testing.T) {
		r := paymentsrepo.NewPostgresRepository(db).(paymentsrepo.ManualRepository)
		c, err := r.CreateManualCheckout(ctx, 911, "wallet_topup", pack, uuid.NewString())
		if err != nil {
			t.Fatal(err)
		}
		if err = r.SubmitManualProof(ctx, 911, c.ID, "NOTICE-TEST", c.Cards[0].ID, "", ""); err != nil {
			t.Fatal(err)
		}
		config, err := r.ManualConfig(ctx)
		if err != nil {
			t.Fatal(err)
		}
		original := config.RejectionMessage
		config.RejectionMessage = "پیام اختصاصی مدیر: {title} — {reason}"
		config, err = r.SaveManualConfig(ctx, *config, admin)
		if err != nil {
			t.Fatal(err)
		}
		reloaded, err := r.ManualConfig(ctx)
		if err != nil || reloaded.RejectionMessage != config.RejectionMessage {
			t.Fatal(reloaded, err)
		}
		var wg sync.WaitGroup
		for i := 0; i < 4; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				if _, err := r.ReviewManualPayment(ctx, c.ID, admin, false, "واریز پیدا نشد"); err != nil {
					t.Error(err)
				}
			}()
		}
		wg.Wait()
		config.RejectionMessage = original
		if _, err = r.SaveManualConfig(ctx, *config, admin); err != nil {
			t.Fatal(err)
		}
		var id, message string
		var count int
		if err = db.QueryRow(ctx, `SELECT id,message FROM broadcasts WHERE source_key=$1`, "manual-review:"+c.ID).Scan(&id, &message); err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(message, "واریز پیدا نشد") || !strings.Contains(message, "پیام اختصاصی مدیر:") {
			t.Fatal(message)
		}
		var botMessage string
		if err = db.QueryRow(ctx, `SELECT message FROM payment_notification_outbox WHERE notification_id=$1`, id).Scan(&botMessage); err != nil || botMessage != message {
			t.Fatal("bot/inbox template mismatch", err)
		}
		if err = db.QueryRow(ctx, `SELECT COUNT(*) FROM payment_notification_outbox WHERE notification_id=$1`, id).Scan(&count); err != nil || count != 1 {
			t.Fatal(count, err)
		}
		if _, err = db.Exec(ctx, `INSERT INTO users(id,telegram_id) VALUES($1,913)`, uuid.NewString()); err != nil {
			t.Fatal(err)
		}
		inbox := broadcastrepo.NewPostgresRepository(db)
		items, total, unread, err := inbox.Inbox(ctx, 911, 100, 0)
		if err != nil || total < 1 || unread < 1 || len(items) < 1 {
			t.Fatal(items, total, unread, err)
		}
		items, total, unread, err = inbox.Inbox(ctx, 913, 100, 0)
		if err != nil || total != 0 || unread != 0 || len(items) != 0 {
			t.Fatal("private result leaked", items, err)
		}
		if _, err = inbox.MarkRead(ctx, 913, id); !errors.Is(err, broadcastrepo.ErrNotFound) {
			t.Fatal("other user read private result", err)
		}
		if err = inbox.MarkAllRead(ctx, 913); err != nil {
			t.Fatal(err)
		}
		var readCount int
		if err = db.QueryRow(ctx, `SELECT COUNT(*) FROM broadcast_reads WHERE broadcast_id=$1`, id).Scan(&readCount); err != nil || readCount != 0 {
			t.Fatal("read-all crossed ownership", err)
		}
		if _, err = inbox.MarkRead(ctx, 911, id); err != nil {
			t.Fatal(err)
		}
		if _, total, err = inbox.List(ctx, 100, 0); err != nil || total != 0 {
			t.Fatal("private payment exposed in broadcasts", total, err)
		}
		if err = inbox.Archive(ctx, id); !errors.Is(err, broadcastrepo.ErrNotFound) {
			t.Fatal("private result archived as broadcast", err)
		}
		outbox := paymentsrepo.NewPostgresRepository(db).(paymentsrepo.ReviewNotificationRepository)
		n, err := outbox.ClaimReviewNotification(ctx)
		if err != nil || n == nil {
			t.Fatal(n, err)
		}
		if n.ChatID != 911 {
			t.Fatal("wrong recipient", n)
		}
		if err = outbox.FinishReviewNotification(ctx, n.ID, uuid.NewString(), "sent", 0); err == nil {
			t.Fatal("stale lease acknowledged")
		}
		if err = outbox.FinishReviewNotification(ctx, n.ID, n.LeaseToken, "retry", 0); err != nil {
			t.Fatal(err)
		}
		seen := map[string]bool{}
		for {
			n, err = outbox.ClaimReviewNotification(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if n == nil {
				break
			}
			if seen[n.ID] {
				t.Fatal("sent notice reclaimed")
			}
			seen[n.ID] = true
			if err = outbox.FinishReviewNotification(ctx, n.ID, n.LeaseToken, "sent", 0); err != nil {
				t.Fatal(err)
			}
		}
	})
	t.Run("notification failure rolls review back", func(t *testing.T) {
		r := paymentsrepo.NewPostgresRepository(db).(paymentsrepo.ManualRepository)
		c, err := r.CreateManualCheckout(ctx, 911, "wallet_topup", pack, uuid.NewString())
		if err != nil {
			t.Fatal(err)
		}
		if err = r.SubmitManualProof(ctx, 911, c.ID, "NOTICE-ROLLBACK", c.Cards[0].ID, "", ""); err != nil {
			t.Fatal(err)
		}
		if _, err = db.Exec(ctx, `ALTER TABLE payment_notification_outbox ADD CONSTRAINT test_reject_notice CHECK(chat_id<>911) NOT VALID`); err != nil {
			t.Fatal(err)
		}
		_, reviewErr := r.ReviewManualPayment(ctx, c.ID, admin, false, "test")
		if _, err = db.Exec(ctx, `ALTER TABLE payment_notification_outbox DROP CONSTRAINT test_reject_notice`); err != nil {
			t.Fatal(err)
		}
		if reviewErr == nil {
			t.Fatal("review succeeded without durable notice")
		}
		got, err := r.GetManualCheckout(ctx, c.ID, 911)
		if err != nil || got.Status != "submitted" {
			t.Fatal(got, err)
		}
		var count int
		if err = db.QueryRow(ctx, `SELECT COUNT(*) FROM broadcasts WHERE source_key=$1`, "manual-review:"+c.ID).Scan(&count); err != nil || count != 0 {
			t.Fatal("inbox survived rollback", count, err)
		}
		if _, err = r.ReviewManualPayment(ctx, c.ID, admin, false, "test"); err != nil {
			t.Fatal(err)
		}
	})
}
