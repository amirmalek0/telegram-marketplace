package database

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"strings"
	"telegram-marketplace/internal/core/botmessages"
	"telegram-marketplace/internal/core/botmessages/model"
	"telegram-marketplace/internal/core/botmessages/repository"
	"testing"
)

// All mutations are in a dedicated temporary schema; no application settings are changed.
func TestBotMessagesPostgres(t *testing.T) {
	dsn := os.Getenv("BOT_MESSAGES_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("isolated Postgres test connection required")
	}
	ctx := context.Background()
	root, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer root.Close()
	schema := "bot_messages_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err = root.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := root.Exec(ctx, "DROP SCHEMA "+quoted+" CASCADE"); err != nil {
			t.Error(err)
		}
	}()
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := db.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec("CREATE TABLE admins(id UUID PRIMARY KEY)")
	exec("CREATE TABLE referral_settings(id BOOLEAN PRIMARY KEY,inviter_message TEXT,invitee_message TEXT)")
	exec("CREATE TABLE manual_payment_config(id BOOLEAN PRIMARY KEY,value JSONB)")
	exec("CREATE TABLE referral_notifications(id UUID)")
	exec("CREATE TABLE payment_notification_outbox(id UUID)")
	exec("INSERT INTO referral_settings VALUES(true,'old {amount} {invitee_name}','old {amount} {inviter_name}')")
	exec("INSERT INTO manual_payment_config VALUES(true,'{}')")
	for i := 0; i < 2; i++ {
		for _, sql := range botMessageMigrations {
			exec(sql)
		}
	}
	admin := uuid.NewString()
	exec("INSERT INTO admins VALUES($1)", admin)
	service := botmessages.NewService(repository.New(db), nil)
	initial, err := service.Load(ctx)
	if err != nil || initial.Revision != 0 || len(initial.Messages) != 17 {
		t.Fatal(initial, err)
	}
	if initial.Messages[7].Text != "old {amount} {invitee_name}" {
		t.Fatal("legacy text not imported")
	}
	initial.Messages[0].Text = "سلام {first_name}"
	initial.Messages[0].Rows = [][]model.Button{{{Text: "VIP", Action: "miniapp", Value: "/vip", Style: "success"}}}
	saved, err := service.Save(ctx, initial.Config, admin)
	if err != nil || saved.Revision != 1 {
		t.Fatal(err)
	}
	if _, err = service.Save(ctx, initial.Config, admin); !errors.Is(err, model.ErrConflict) {
		t.Fatal("concurrent update not protected", err)
	}
	reloaded, err := service.Load(ctx)
	if err != nil || reloaded.Messages[0].Text != initial.Messages[0].Text || reloaded.Messages[0].Rows[0][0].Style != "success" {
		t.Fatal("roundtrip failed", err)
	}
	initial.Config.Revision = 1
	initial.Messages[0].Rows[0][0].Value = "javascript:bad"
	initial.Messages[0].Rows[0][0].Action = "url"
	if _, err = service.Save(ctx, initial.Config, admin); !errors.Is(err, model.ErrInvalid) {
		t.Fatal("unsafe link accepted", err)
	}
}
