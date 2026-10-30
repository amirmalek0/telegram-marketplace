package settings

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/settings/repository"
)

// Uses a disposable schema: never writes existing marketplace content.
func TestGlobalCascadePostgres(t *testing.T) {
	dsn := os.Getenv("COUPON_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set COUPON_TEST_DATABASE_URL for isolated PostgreSQL tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := "widget_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := admin.Exec(ctx, "DROP SCHEMA "+quoted+" CASCADE"); err != nil {
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
	if _, err := db.Exec(ctx, "CREATE TABLE miniapp_content (LIKE public.miniapp_content INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)"); err != nil {
		t.Fatal(err)
	}
	repo := repository.NewPostgresRepository(db)
	svc := NewService(repo)
	adminID := uuid.NewString()
	key := globalWidgetPrefix + globalTestID
	definition := globalJSON("cascade test", imageLayout(map[string]any{}, "", ""))
	page := globalPage(globalReference("widget-ref12345"), globalReference("widget-ref12346"))
	for key, value := range map[string]string{key: definition, "appearance.page.shop": page, "appearance.page.profile": page, "shop.title": "unchanged"} {
		if _, err := repo.UpsertContent(ctx, key, value, adminID); err != nil {
			t.Fatal(err)
		}
	}
	// Force a write failure after at least one page update, then verify rollback.
	if _, err := db.Exec(ctx, `CREATE FUNCTION fail_widget_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END; $$; CREATE TRIGGER fail_delete BEFORE DELETE ON miniapp_content FOR EACH ROW EXECUTE FUNCTION fail_widget_delete()`); err != nil {
		t.Fatal(err)
	}
	if err := svc.DeleteGlobalWidget(ctx, key, adminID); err == nil {
		t.Fatal("expected forced delete failure")
	}
	before, err := repo.ListContent(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(before) != 4 {
		t.Fatal("rollback lost content")
	}
	for _, entry := range before {
		if strings.HasPrefix(entry.Key, "appearance.page.") && entry.Value != page {
			t.Fatal("partial page update committed")
		}
	}
	if _, err := db.Exec(ctx, "DROP TRIGGER fail_delete ON miniapp_content"); err != nil {
		t.Fatal(err)
	}
	if err := svc.DeleteGlobalWidget(ctx, key, adminID); err != nil {
		t.Fatal(err)
	}
	after, err := repo.ListContent(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(after) != 3 {
		t.Fatal("definition was not deleted")
	}
	for _, entry := range after {
		if strings.HasPrefix(entry.Key, "appearance.page.") && entry.Value != `{"sections":[],"version":1}` {
			t.Fatalf("references remain: %s", entry.Value)
		}
		if entry.Key == "shop.title" && entry.Value != "unchanged" {
			t.Fatal("unrelated content changed")
		}
	}
	// Stale editors cannot reintroduce a link after the definition is gone.
	if _, err := svc.UpdateContent(ctx, "appearance.page.shop", page, adminID); err == nil {
		t.Fatal("dangling link recreated")
	}
}
