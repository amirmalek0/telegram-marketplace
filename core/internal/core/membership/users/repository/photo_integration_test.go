package repository_test

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"strings"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/internal/core/membership/users/model"
	usersrepo "telegram-marketplace/internal/core/membership/users/repository"
	"testing"
)

func TestCustomerPhotoAndWalletPostgres(t *testing.T) {
	url := os.Getenv("COUPON_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set COUPON_TEST_DATABASE_URL for isolated customer tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := "customer_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
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
	for _, table := range []string{"users", "wallet_transactions"} {
		id := pgx.Identifier{table}.Sanitize()
		exec("CREATE TABLE " + id + " (LIKE public." + id + " INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)")
	}
	exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT ''")
	users := usersrepo.NewPostgresRepository(db)
	wallets := paymentsrepo.NewPostgresRepository(db)
	user := &model.User{TelegramID: 42, FirstName: "Amir"}
	if _, err := users.UpsertProfile(ctx, user); err != nil {
		t.Fatal(err)
	}
	exec("UPDATE users SET phone_number='989123456789',phone_verified_at=now(),has_active_plan=true WHERE id=$1", user.ID)
	photo := "https://t.me/i/userpic/demo.svg"
	if err := users.UpdatePhotoURL(ctx, user.ID, photo); err != nil {
		t.Fatal(err)
	}
	if _, err := users.UpsertProfile(ctx, user); err != nil {
		t.Fatal(err)
	}
	loaded, err := users.GetByTelegramID(ctx, 42)
	if err != nil || loaded.PhotoURL != photo || loaded.PhoneVerifiedAt == nil || loaded.PhoneNumber != "989123456789" {
		t.Fatalf("profile not preserved: %+v %v", loaded, err)
	}
	rows, err := users.List(ctx, 20, 0)
	if err != nil || len(rows) != 1 || rows[0].PhotoURL != photo {
		t.Fatalf("list scan: %+v %v", rows, err)
	}
	walletRows, err := wallets.ListAdminWallets(ctx, 20, 0)
	if err != nil || len(walletRows) != 1 || walletRows[0].PhotoURL != photo || walletRows[0].PhoneNumber != "989123456789" || walletRows[0].HasActivePlan {
		t.Fatalf("wallet list: %+v %v", walletRows, err)
	}
	detail, err := wallets.AdjustWallet(ctx, user.ID, 25, "test credit")
	if err != nil || detail.Wallet.PhotoURL != photo || detail.Wallet.Balance != 25 || len(detail.Transactions) != 1 {
		t.Fatalf("adjust response: %+v %v", detail, err)
	}
	if err := users.UpdatePhotoURL(ctx, user.ID, ""); err != nil {
		t.Fatal(err)
	}
	loaded, err = users.GetByID(ctx, user.ID)
	if err != nil || loaded.PhotoURL != "" {
		t.Fatal("photo clear failed", err)
	}
}
