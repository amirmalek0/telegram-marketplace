package database

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/membership/referrals/model"
	"telegram-marketplace/internal/core/membership/referrals/repository"
)

// Opt-in: a uniquely named schema contains ALL fixtures and is dropped afterwards.
// Never modifies users, settings or balances in the application's public schema.
func TestReferralPostgres(t *testing.T) {
	url := os.Getenv("REFERRAL_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set REFERRAL_TEST_DATABASE_URL to run isolated PostgreSQL tests")
	}
	ctx := context.Background()
	adminDB, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer adminDB.Close()
	schema := "referral_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err = adminDB.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := adminDB.Exec(ctx, "DROP SCHEMA "+quoted+" CASCADE"); err != nil {
			t.Error(err)
		}
	}()
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	cfg.MaxConns = 12
	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	// Minimal existing-schema contract. Test referral upgrades independently of
	// unrelated historical migrations, which explicitly assume the public schema.
	for _, sql := range []string{
		`CREATE TABLE settings(id UUID PRIMARY KEY,require_phone_verification BOOLEAN NOT NULL)`,
		`INSERT INTO settings VALUES('00000000-0000-0000-0000-000000000001',true)`,
		`CREATE TABLE admins(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),username TEXT,password_hash TEXT)`,
		`CREATE TABLE users(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),telegram_id BIGINT UNIQUE NOT NULL,first_name TEXT,last_name TEXT,username TEXT,wallet_balance BIGINT NOT NULL DEFAULT 0,is_banned BOOLEAN NOT NULL DEFAULT false,phone_number TEXT NOT NULL DEFAULT '',phone_verified_at TIMESTAMPTZ)`,
		`CREATE TABLE referrals(id UUID PRIMARY KEY DEFAULT gen_random_uuid())`,
		`CREATE TABLE payments(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id) ON DELETE CASCADE,purpose TEXT,method TEXT,currency TEXT,amount_minor BIGINT,checkout_reference TEXT,status TEXT,is_test BOOLEAN,paid_at TIMESTAMPTZ)`,
		`CREATE TABLE wallet_transactions(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id) ON DELETE CASCADE,type TEXT,amount BIGINT CHECK(amount>0),balance_before BIGINT,balance_after BIGINT,description TEXT)`,
	} {
		if _, err = db.Exec(ctx, sql); err != nil {
			t.Fatal(err)
		}
	}
	for pass := 0; pass < 2; pass++ {
		for i, sql := range referralMigrations {
			if _, err = db.Exec(ctx, sql); err != nil {
				t.Fatalf("migration pass=%d statement=%d: %v", pass, i, err)
			}
		}
	}
	if _, err = db.Exec(ctx, `ALTER TABLE referral_notifications ADD COLUMN IF NOT EXISTS template_vars JSONB NOT NULL DEFAULT '{}'::jsonb`); err != nil {
		t.Fatal(err)
	}
	repo := repository.NewPostgresRepository(db)
	s, err := repo.Settings(ctx)
	if err != nil || s.Enabled || s.InviterStars != 10 || s.InviteeStars != 10 {
		t.Fatalf("defaults: %+v %v", s, err)
	}
	var admin string
	if err = db.QueryRow(ctx, `INSERT INTO admins(username,password_hash) VALUES('referral_test','not-a-real-password') RETURNING id`).Scan(&admin); err != nil {
		t.Fatal(err)
	}
	tg := int64(1000)
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := db.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	configure := func(enabled bool, trigger string, a, b int64) {
		t.Helper()
		if err := repo.SaveSettings(ctx, model.Settings{Enabled: enabled, RewardTrigger: trigger, InviterStars: a, InviteeStars: b}, admin); err != nil {
			t.Fatal(err)
		}
	}
	user := func(code string) (string, int64) {
		t.Helper()
		tg++
		id, created, err := repo.Onboard(ctx, tg, "Test", "User", "test", code)
		if err != nil || !created {
			t.Fatalf("onboard: %v %v", created, err)
		}
		return id, tg
	}
	inviter := func() (string, string, int64) {
		t.Helper()
		id, n := user("")
		_, code, err := repo.Summary(ctx, n)
		if err != nil {
			t.Fatal(err)
		}
		return id, code, n
	}
	balance := func(id string, want int64) {
		t.Helper()
		var got int64
		if err := db.QueryRow(ctx, `SELECT wallet_balance FROM users WHERE id=$1`, id).Scan(&got); err != nil || got != want {
			t.Fatalf("balance got %d want %d: %v", got, want, err)
		}
	}
	reward := func(n int64) {
		t.Helper()
		if err := repo.Reward(ctx, n); err != nil {
			t.Fatal(err)
		}
	}
	payment := func(id, purpose, status string, test bool) {
		t.Helper()
		exec(`INSERT INTO payments(user_id,purpose,method,currency,amount_minor,checkout_reference,status,is_test,paid_at) VALUES($1,$2,'wallet','XTR',5,$3,$4,$5,now())`, id, purpose, uuid.NewString(), status, test)
	}

	t.Run("phone rewards require the global phone gate", func(t *testing.T) {
		configure(true, "phone_verified", 12, 8)
		a, code, _ := inviter()
		b, n := user(code)
		exec(`UPDATE users SET phone_number='+989123456789',phone_verified_at=now() WHERE id=$1`, b)
		exec(`UPDATE settings SET require_phone_verification=false`)
		defer exec(`UPDATE settings SET require_phone_verification=true`)
		config, err := repo.Settings(ctx)
		if err != nil || config.Enabled || config.RewardTrigger != "phone_verified" {
			t.Fatalf("rule not safely paused: %+v %v", config, err)
		}
		config.Enabled = true
		if err := repo.SaveSettings(ctx, config, admin); !errors.Is(err, model.ErrPhoneVerificationDisabled) {
			t.Fatalf("invalid combination accepted: %v", err)
		}
		reward(n)
		balance(a, 0)
		balance(b, 0)
		_, pausedN := user(code)
		paused, _, err := repo.Summary(ctx, pausedN)
		if err != nil || paused.Invitation != nil || paused.Enabled {
			t.Fatalf("paused rule attributed invitation: %+v %v", paused, err)
		}
		// Switching the current rule must not accidentally pay old phone-based snapshots.
		configure(true, "bot_open", 10, 10)
		reward(n)
		balance(a, 0)
		balance(b, 0)
		ids, err := repo.Eligible(ctx)
		if err != nil {
			t.Fatal(err)
		}
		for _, id := range ids {
			if id == n {
				t.Fatal("paused phone reward was eligible")
			}
		}
		c, cn := user(code)
		reward(cn)
		balance(c, 10)
		balance(a, 10)
		exec(`UPDATE settings SET require_phone_verification=true`)
		reward(n)
		reward(n)
		balance(a, 22)
		balance(b, 8)
	})
	t.Run("disabled and existing users cannot attach", func(t *testing.T) {
		configure(false, "bot_open", 10, 10)
		a, code, an := inviter()
		b, bn := user(code)
		reward(bn)
		balance(a, 0)
		balance(b, 0)
		configure(true, "bot_open", 10, 10)
		for _, n := range []int64{an, bn} {
			_, created, err := repo.Onboard(ctx, n, "Again", "", "", code)
			if err != nil || created {
				t.Fatal("existing account recreated")
			}
			reward(n)
		}
		balance(a, 0)
		balance(b, 0)
		c, cn := user("invalid")
		reward(cn)
		balance(c, 0)
	})
	t.Run("concurrent starts and payouts credit exactly once", func(t *testing.T) {
		configure(true, "bot_open", 10, 7)
		a, code, _ := inviter()
		tg++
		n := tg
		var wg sync.WaitGroup
		failures := make(chan error, 24)
		for i := 0; i < 24; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, _, err := repo.Onboard(ctx, n, "Concurrent", "", "", code)
				if err == nil {
					err = repo.Reward(ctx, n)
				}
				if err != nil {
					failures <- err
				}
			}()
		}
		wg.Wait()
		close(failures)
		for err := range failures {
			t.Error(err)
		}
		var b string
		if err := db.QueryRow(ctx, `SELECT id FROM users WHERE telegram_id=$1`, n).Scan(&b); err != nil {
			t.Fatal(err)
		}
		balance(a, 10)
		balance(b, 7)
		var count int
		if err := db.QueryRow(ctx, `SELECT count(*) FROM wallet_transactions WHERE user_id IN ($1,$2)`, a, b).Scan(&count); err != nil || count != 2 {
			t.Fatalf("ledger count %d: %v", count, err)
		}
		summary, _, err := repo.Summary(ctx, n)
		if err != nil || summary.Invitation == nil || summary.Invitation.RewardedAt == nil {
			t.Fatalf("missing reward: %+v %v", summary, err)
		}
	})
	t.Run("phone condition snapshot and pause resume", func(t *testing.T) {
		configure(true, "phone_verified", 12, 8)
		a, code, _ := inviter()
		b, n := user(code)
		reward(n)
		balance(a, 0)
		configure(false, "bot_open", 999, 999)
		exec(`UPDATE users SET phone_number='+989123456789',phone_verified_at=now() WHERE id=$1`, b)
		reward(n)
		balance(b, 0)
		configure(true, "bot_open", 999, 999)
		reward(n)
		balance(a, 12)
		balance(b, 8)
	})
	t.Run("purchase excludes topups failed pending refunded and test", func(t *testing.T) {
		configure(true, "first_purchase", 10, 10)
		a, code, _ := inviter()
		b, n := user(code)
		for _, p := range []struct {
			purpose, status string
			test            bool
		}{{"wallet_topup", "succeeded", false}, {"product", "failed", false}, {"product", "pending", false}, {"product", "refunded", false}, {"product", "succeeded", true}} {
			payment(b, p.purpose, p.status, p.test)
			reward(n)
			balance(a, 0)
			balance(b, 0)
		}
		payment(b, "vip_plan", "succeeded", false)
		reward(n)
		reward(n)
		balance(a, 10)
		balance(b, 10)
	})
	t.Run("banned user blocks both rewards", func(t *testing.T) {
		configure(true, "bot_open", 10, 10)
		a, code, _ := inviter()
		b, n := user(code)
		exec(`UPDATE users SET is_banned=true WHERE id=$1`, b)
		reward(n)
		balance(a, 0)
		balance(b, 0)
		exec(`UPDATE users SET is_banned=false WHERE id=$1`, b)
		reward(n)
		balance(a, 10)
		balance(b, 10)
	})
	t.Run("failed second ledger entry rolls everything back", func(t *testing.T) {
		configure(true, "bot_open", 17, 23)
		a, code, _ := inviter()
		b, n := user(code)
		exec(`ALTER TABLE wallet_transactions ADD CONSTRAINT test_fail_reward CHECK(amount<>23)`)
		if err := repo.Reward(ctx, n); err == nil {
			t.Fatal("expected ledger failure")
		}
		balance(a, 0)
		balance(b, 0)
		exec(`ALTER TABLE wallet_transactions DROP CONSTRAINT test_fail_reward`)
		var queued int
		if err := db.QueryRow(ctx, `SELECT count(*) FROM referral_notifications WHERE user_id IN ($1,$2)`, a, b).Scan(&queued); err != nil || queued != 0 {
			t.Fatalf("rolled-back credit queued notification: %d %v", queued, err)
		}
		reward(n)
		balance(a, 17)
		balance(b, 23)
	})
	t.Run("zero amounts settle without invalid ledger rows", func(t *testing.T) {
		configure(true, "bot_open", 0, 0)
		a, code, _ := inviter()
		b, n := user(code)
		reward(n)
		balance(a, 0)
		balance(b, 0)
		summary, _, err := repo.Summary(ctx, n)
		if err != nil || summary.Invitation.RewardedAt == nil {
			t.Fatal("zero reward remains pending", err)
		}
		var queued int
		if err := db.QueryRow(ctx, `SELECT count(*) FROM referral_notifications WHERE user_id IN ($1,$2)`, a, b).Scan(&queued); err != nil || queued != 0 {
			t.Fatalf("zero credit queued notification: %d %v", queued, err)
		}
	})
	t.Run("deleted and recreated invitee cannot earn twice", func(t *testing.T) {
		configure(true, "bot_open", 10, 10)
		a, code, _ := inviter()
		b, n := user(code)
		reward(n)
		exec(`DELETE FROM users WHERE id=$1`, b)
		_, _, err := repo.Onboard(ctx, n, "Recreated", "", "", code)
		if err != nil {
			t.Fatal(err)
		}
		reward(n)
		balance(a, 10)
	})
	t.Run("eligible scan", func(t *testing.T) {
		configure(true, "first_purchase", 10, 10)
		_, code, _ := inviter()
		b, n := user(code)
		payment(b, "product", "succeeded", false)
		ids, err := repo.Eligible(ctx)
		if err != nil {
			t.Fatal(err)
		}
		found := false
		for _, id := range ids {
			if id == n {
				found = true
			}
		}
		if !found {
			t.Fatal(fmt.Sprintf("eligible user %d absent", n))
		}
	})
	t.Run("notification templates snapshots leases and retry", func(t *testing.T) {
		// Silence other fixtures in this disposable schema only.
		exec(`UPDATE referral_notifications SET sent_at=now()`)
		settings := model.Settings{Enabled: true, RewardTrigger: "phone_verified", InviterStars: 13, InviteeStars: 7, InviterMessage: "{inviter_name}: {amount} from {invitee_name}", InviteeMessage: "{invitee_name}: {amount} thanks to {inviter_name}"}
		if err := repo.SaveSettings(ctx, settings, admin); err != nil {
			t.Fatal(err)
		}
		a, code, an := inviter()
		b, bn := user(code)
		exec(`UPDATE users SET first_name='Amir',last_name='' WHERE id=$1`, a)
		exec(`UPDATE users SET first_name='Sara',last_name='' WHERE id=$1`, b)
		reward(bn)
		queue := repo.(repository.NotificationRepository)
		if n, err := queue.ClaimNotification(ctx); err != nil || n != nil {
			t.Fatal("notification before credit", n, err)
		}
		exec(`UPDATE users SET phone_number='+989123456789',phone_verified_at=now() WHERE id=$1`, b)
		reward(bn)
		reward(bn)
		// Disable and edit settings after payout; pending messages retain the committed text.
		settings.Enabled = false
		settings.InviterMessage = "Changed {amount} {invitee_name}"
		if err := repo.SaveSettings(ctx, settings, admin); err != nil {
			t.Fatal(err)
		}
		var wg sync.WaitGroup
		claimed := make(chan *model.Notification, 2)
		for i := 0; i < 2; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				n, err := queue.ClaimNotification(ctx)
				if err != nil {
					t.Error(err)
				} else {
					claimed <- n
				}
			}()
		}
		wg.Wait()
		close(claimed)
		seen := map[string]bool{}
		for n := range claimed {
			if n == nil || seen[n.ID] {
				t.Fatal("duplicate claim", n)
			}
			seen[n.ID] = true
			want := "Sara: 7 thanks to Amir"
			if n.ChatID == an {
				want = "Amir: 13 from Sara"
			} else if n.ChatID != bn {
				t.Fatal("wrong recipient", n.ChatID)
			}
			if n.Message != want {
				t.Fatal("wrong snapshot", n.Message)
			}
			if err := queue.FinishNotification(ctx, n.ID, uuid.NewString(), "sent", 0); err == nil {
				t.Fatal("stale worker acknowledged")
			}
			if err := queue.FinishNotification(ctx, n.ID, n.LeaseToken, "retry", 60); err != nil {
				t.Fatal(err)
			}
		}
		if len(seen) != 2 {
			t.Fatal("expected two notifications")
		}
		if n, err := queue.ClaimNotification(ctx); err != nil || n != nil {
			t.Fatal("retried too early", n, err)
		}
		exec(`UPDATE referral_notifications SET next_attempt_at=now() WHERE sent_at IS NULL`)
		n, err := queue.ClaimNotification(ctx)
		if err != nil || n == nil {
			t.Fatal("retry missing", err)
		}
		exec(`UPDATE referral_notifications SET lease_until=now()-interval '1 second' WHERE id=$1`, n.ID)
		for i := 0; i < 2; i++ {
			retry, err := queue.ClaimNotification(ctx)
			if err != nil || retry == nil || retry.Attempts < 2 {
				t.Fatal("retry claim", retry, err)
			}
			if retry.ID == n.ID && retry.LeaseToken == n.LeaseToken {
				t.Fatal("expired lease reused")
			}
			if err := queue.FinishNotification(ctx, retry.ID, retry.LeaseToken, "sent", 0); err != nil {
				t.Fatal(err)
			}
		}
		if n, err := queue.ClaimNotification(ctx); err != nil || n != nil {
			t.Fatal("delivered messages claimed again", n, err)
		}
		balance(a, 13)
		balance(b, 7)
		summary, _, err := repo.Summary(ctx, an)
		if err != nil || summary.InviterMessage != "" || summary.InviteeMessage != "" {
			t.Fatal("admin templates leaked", err)
		}
	})
}
