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

func TestVIPQuoteWithTextPlanReference(t *testing.T) {
	dsn := os.Getenv("COUPON_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set COUPON_TEST_DATABASE_URL for isolated VIP quote tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := "vip_quote_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
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
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := db.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	// Match the production types, including the legacy TEXT plan reference.
	exec(`CREATE TABLE users(telegram_id BIGINT PRIMARY KEY,active_plan_id TEXT,plan_expire_at TIMESTAMPTZ)`)
	exec(`CREATE TABLE vip_plans(id UUID PRIMARY KEY,title TEXT,stars_price BIGINT,tier INTEGER,duration INTEGER,status TEXT)`)
	target, current := uuid.NewString(), uuid.NewString()
	exec(`INSERT INTO vip_plans VALUES($1,'Quarterly',130,2,90,'active'),($2,'Monthly',60,1,30,'active')`, target, current)
	exec(`INSERT INTO users(telegram_id) VALUES(42)`)
	r := NewPostgresRepository(db)
	for _, reference := range []any{nil, "", "legacy-invalid-reference", uuid.NewString(), current} {
		exec(`UPDATE users SET active_plan_id=$1,plan_expire_at=now()+interval '15 days' WHERE telegram_id=42`, reference)
		data, err := r.GetVIPQuoteData(ctx, 42, target)
		if err != nil || data.OriginalStars != 130 || data.TargetTier != 2 {
			t.Fatalf("reference %v: %+v %v", reference, data, err)
		}
		if reference == current {
			if data.CurrentPlanTitle != "Monthly" || data.CurrentPrice != 60 || data.CurrentDuration != 30 || data.CurrentTier != 1 || data.CurrentPlanID == nil || *data.CurrentPlanID != current {
				t.Fatalf("current membership missing: %+v", data)
			}
		} else if data.CurrentPrice != 0 {
			t.Fatal("unmatched reference has credit")
		}
	}
	if _, err := r.GetVIPQuoteData(ctx, 42, uuid.NewString()); !errors.Is(err, ErrCheckoutUnavailable) {
		t.Fatal("missing plan", err)
	}
	if _, err := r.GetVIPQuoteData(ctx, 999, target); !errors.Is(err, ErrCheckoutUnavailable) {
		t.Fatal("missing user", err)
	}
	exec(`UPDATE vip_plans SET status='inactive' WHERE id=$1`, target)
	if _, err := r.GetVIPQuoteData(ctx, 42, target); !errors.Is(err, ErrCheckoutUnavailable) {
		t.Fatal("inactive plan", err)
	}
	exec(`ALTER TABLE vip_plans RENAME COLUMN tier TO broken_tier`)
	if _, err := r.GetVIPQuoteData(ctx, 42, target); err == nil || errors.Is(err, ErrCheckoutUnavailable) {
		t.Fatal("database error hidden as unavailable", err)
	}
}
