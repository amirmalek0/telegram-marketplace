package database

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"strings"
	"sync"
	botrepo "telegram-marketplace/internal/bot/repository"
	authrepo "telegram-marketplace/internal/core/membership/auth/repository"
	ticketmodel "telegram-marketplace/internal/core/membership/tickets/model"
	ticketrepo "telegram-marketplace/internal/core/membership/tickets/repository"
	telegram "telegram-marketplace/internal/platform/telegram"
	"testing"
	"time"
)

func TestSecurityMigrationsAndRepositories(t *testing.T) {
	dsn := os.Getenv("COUPON_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("isolated database required")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := "security_schema_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, e := admin.Exec(ctx, "DROP SCHEMA "+quoted+" CASCADE"); e != nil {
			t.Error(e)
		}
	}()
	cfg, _ := pgxpool.ParseConfig(dsn)
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, e := db.Exec(ctx, sql, args...); e != nil {
			t.Fatal(e)
		}
	}
	for _, table := range []string{"admins", "payments", "tickets", "ticket_messages"} {
		q := pgx.Identifier{table}.Sanitize()
		exec("CREATE TABLE " + q + " (LIKE public." + q + " INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)")
	}
	for pass := 0; pass < 2; pass++ {
		for _, sql := range securityMigrations {
			exec(sql)
		}
	}
	t.Run("single use refresh and persistent logout", func(t *testing.T) {
		id, sid, rid := uuid.NewString(), uuid.NewString(), uuid.NewString()
		exec(`INSERT INTO admins(id,username,password_hash,is_active) VALUES($1,'test','hash',true)`, id)
		sessions := authrepo.NewSessions(db)
		if e := sessions.Create(ctx, sid, id, rid, time.Now().Add(time.Hour)); e != nil {
			t.Fatal(e)
		}
		var wg sync.WaitGroup
		success := make(chan bool, 2)
		for i := 0; i < 2; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				ok, e := sessions.Rotate(ctx, sid, id, rid, uuid.NewString(), time.Now().Add(time.Hour))
				if e != nil {
					t.Error(e)
				}
				success <- ok
			}()
		}
		wg.Wait()
		close(success)
		count := 0
		for ok := range success {
			if ok {
				count++
			}
		}
		if count != 1 {
			t.Fatal("refresh replay", count)
		}
		if e := sessions.Revoke(ctx, sid, id); e != nil {
			t.Fatal(e)
		}
		if ok, e := sessions.Valid(ctx, sid, id); e != nil || ok {
			t.Fatal("logout not persisted", e)
		}
	})
	t.Run("durable failed update queue", func(t *testing.T) {
		q := botrepo.New(db)
		u := telegram.Update{UpdateID: 123}
		if e := q.Enqueue(ctx, u); e != nil {
			t.Fatal(e)
		}
		if e := q.Enqueue(ctx, u); e != nil {
			t.Fatal("duplicate enqueue", e)
		}
		exec(`UPDATE telegram_failed_updates SET next_attempt_at=now()-interval '1 second'`)
		job, e := q.Claim(ctx)
		if e != nil || job == nil || job.Update.UpdateID != 123 || job.Attempts != 1 {
			t.Fatal(job, e)
		}
		if second, e := q.Claim(ctx); e != nil || second != nil {
			t.Fatal("concurrent lease", second, e)
		}
		exec(`UPDATE telegram_failed_updates SET next_attempt_at=now()-interval '1 second'`)
		job, e = q.Claim(ctx)
		if e != nil || job == nil || job.Attempts != 2 {
			t.Fatal("crashed worker not recoverable", job, e)
		}
		if e := q.Retry(ctx, 123, true); e != nil {
			t.Fatal(e)
		}
		exec(`UPDATE telegram_failed_updates SET next_attempt_at=now()-interval '1 second'`)
		if job, e := q.Claim(ctx); e != nil || job != nil {
			t.Fatal("dead letter blocked queue", job, e)
		}
		if e := q.Done(ctx, 123); e != nil {
			t.Fatal(e)
		}
	})
	t.Run("ticket closure and atomic message write", func(t *testing.T) {
		id, owner := uuid.NewString(), uuid.NewString()
		exec(`INSERT INTO tickets(id,user_id,subject,status,priority,category,last_message_at) VALUES($1,$2,'Test','closed','medium','technical',now())`, id, owner)
		repo := ticketrepo.NewPostgresRepository(db)
		msg := &ticketmodel.TicketMessage{TicketID: id, SenderType: "user", SenderID: owner, Message: "Hello", CreatedAt: time.Now()}
		if e := repo.CreateMessage(ctx, msg); !errors.Is(e, ticketrepo.ErrTicketClosed) {
			t.Fatal("closed ticket accepted message", e)
		}
		exec(`UPDATE tickets SET status='open' WHERE id=$1`, id)
		exec(`CREATE FUNCTION reject_ticket_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$`)
		exec(`CREATE TRIGGER fail_ticket_update BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION reject_ticket_update()`)
		if e := repo.CreateMessage(ctx, msg); e == nil {
			t.Fatal("expected timestamp failure")
		}
		var count int
		if e := db.QueryRow(ctx, "SELECT count(*) FROM ticket_messages").Scan(&count); e != nil || count != 0 {
			t.Fatal("partial write", count, e)
		}
		exec(`DROP TRIGGER fail_ticket_update ON tickets`)
		if e := repo.CreateMessage(ctx, msg); e != nil {
			t.Fatal(e)
		}
		if e := db.QueryRow(ctx, "SELECT count(*) FROM ticket_messages").Scan(&count); e != nil || count != 1 {
			t.Fatal(count, e)
		}
	})
}
