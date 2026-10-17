package repository

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Uses disposable table definitions; never publishes to real users.
func TestBroadcastInboxPostgres(t *testing.T) {
	url := os.Getenv("BROADCAST_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set BROADCAST_TEST_DATABASE_URL for isolated database tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := "broadcast_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := admin.Exec(ctx, "DROP SCHEMA "+quoted+" CASCADE"); err != nil {
			t.Error(err)
		}
	}()
	cfg, err := pgxpool.ParseConfig(url)
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
	for _, table := range []string{"users", "broadcasts", "broadcast_reads"} {
		id := pgx.Identifier{table}.Sanitize()
		exec("CREATE TABLE " + id + " (LIKE public." + id + " INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)")
	}
	exec("INSERT INTO users(id,telegram_id) VALUES($1,42),($2,43)", uuid.NewString(), uuid.NewString())
	repo := NewPostgresRepository(db)
	adminID, requestID := uuid.NewString(), uuid.NewString()
	item, err := repo.Publish(ctx, "خبر جدید", "متن اعلان", adminID, requestID)
	if err != nil {
		t.Fatal(err)
	}
	retry, err := repo.Publish(ctx, "خبر جدید", "متن اعلان", adminID, requestID)
	if err != nil || retry.ID != item.ID {
		t.Fatalf("publish retry: %+v %v", retry, err)
	}
	if _, err := repo.Publish(ctx, "متفاوت", "متن اعلان", adminID, requestID); !errors.Is(err, ErrPublishConflict) {
		t.Fatalf("conflict: %v", err)
	}
	list, total, unread, err := repo.Inbox(ctx, 42, 20, 0)
	if err != nil || total != 1 || unread != 1 || len(list) != 1 {
		t.Fatalf("inbox: %+v %d %d %v", list, total, unread, err)
	}
	first, err := repo.MarkRead(ctx, 42, item.ID)
	if err != nil {
		t.Fatal(err)
	}
	second, err := repo.MarkRead(ctx, 42, item.ID)
	if err != nil || !first.Equal(*second) {
		t.Fatalf("read idempotency: %v", err)
	}
	if count, err := repo.Unread(ctx, 42); err != nil || count != 0 {
		t.Fatalf("reader count: %d %v", count, err)
	}
	if count, err := repo.Unread(ctx, 43); err != nil || count != 1 {
		t.Fatalf("other user count: %d %v", count, err)
	}
	if err := repo.MarkAllRead(ctx, 43); err != nil {
		t.Fatal(err)
	}
	history, total, err := repo.List(ctx, 20, 0)
	if err != nil || total != 1 || history[0].ReadCount != 2 {
		t.Fatalf("history: %+v %v", history, err)
	}
	if err := repo.Archive(ctx, item.ID); err != nil {
		t.Fatal(err)
	}
	list, total, unread, err = repo.Inbox(ctx, 42, 20, 0)
	if err != nil || total != 0 || unread != 0 || len(list) != 0 {
		t.Fatalf("archive: %+v %v", list, err)
	}
	if _, err := repo.MarkRead(ctx, 42, item.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("archived read: %v", err)
	}
	history, total, err = repo.List(ctx, 20, 0)
	if err != nil || total != 1 || history[0].ArchivedAt == nil {
		t.Fatalf("archived history: %+v %v", history, err)
	}
	exec("UPDATE users SET is_banned=true WHERE telegram_id=43")
	if _, err := repo.Unread(ctx, 43); !errors.Is(err, ErrUserUnavailable) {
		t.Fatalf("banned user: %v", err)
	}
}
