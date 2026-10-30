package database

import (
	"context"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/commerce/payments/manual"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
)

// Runs only against an explicitly supplied local test connection. All writes
// live in a freshly created, named schema; the application data is never edited.
func TestManualPaymentLifecyclePostgres(t *testing.T) {
	dsn := os.Getenv("COUPON_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("isolated Postgres connection required")
	}
	ctx := context.Background()
	root, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer root.Close()
	schema := "manual_payment_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
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
	for _, table := range []string{"users", "admins", "products", "vip_plans", "wallet_topup_packs", "orders", "payments", "user_vip_subscriptions", "wallet_transactions", "settings", "order_deliveries", "order_delivery_items", "inventory_items", "product_files", "files", "delivery_messages", "bundles", "apis", "broadcasts", "broadcast_reads", "coupons"} {
		name := pgx.Identifier{table}.Sanitize()
		exec("CREATE TABLE " + name + " (LIKE public." + name + " INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)")
	}
	for i := 0; i < 2; i++ {
		for _, sql := range append(append(append([]string{}, manualPaymentMigrations...), paymentMethodMigrations...), paymentNotificationMigrations...) {
			exec(sql)
		}
	} // migration is restart-safe
	exec(`ALTER TABLE payment_notification_outbox ADD COLUMN IF NOT EXISTS template_key TEXT NOT NULL DEFAULT ''`)
	exec(`ALTER TABLE payment_notification_outbox ADD COLUMN IF NOT EXISTS template_vars JSONB NOT NULL DEFAULT '{}'::jsonb`)
	for _, sql := range couponCurrencyMigrations {
		exec(sql)
	}
	user, admin, pack, product, message, plan := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	exec(`INSERT INTO users(id,telegram_id) VALUES($1,911)`, user)
	exec(`INSERT INTO admins(id,username,password_hash) VALUES($1,'manual-test','not-a-password')`, admin)
	exec(`INSERT INTO settings(id,payment_test_mode) VALUES('00000000-0000-0000-0000-000000000001',false)`)
	exec(`INSERT INTO wallet_topup_packs(id,title,stars,toman_price) VALUES($1,'Test pack',25,50000)`, pack)
	exec(`INSERT INTO vip_plans(id,title,stars_price,duration,tier,toman_price) VALUES($1,'Test VIP',100,30,1,100000)`, plan)
	exec(`INSERT INTO delivery_messages(id,name,content) VALUES($1,'Test','Private delivery')`, message)
	exec(`INSERT INTO products(id,title,category_id,stars_price,toman_price,delivery_type,message_id,repurchasable) VALUES($1,'Test product',$2,20,15000,'message',$3,true)`, product, uuid.NewString(), message)
	r := paymentsrepo.NewPostgresRepository(db).(paymentsrepo.ManualRepository)
	config := manual.DefaultConfig()
	config.Enabled = true
	config.Cards = []manual.Card{{Number: "6219861034529007", Owner: "صاحب کارت", Active: true}}
	config, err = manual.ValidateConfig(config)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = r.SaveManualConfig(ctx, config, admin); err != nil {
		t.Fatal(err)
	}
	methodRepo := paymentsrepo.NewPostgresRepository(db).(paymentsrepo.MethodRepository)
	methods, err := methodRepo.PaymentMethods(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	methods.CardToCard = true
	if _, err = methodRepo.SavePaymentMethods(ctx, *methods); err != nil {
		t.Fatal(err)
	}
	create := func(purpose, target string) *manual.Checkout {
		t.Helper()
		c, err := r.CreateManualCheckout(ctx, 911, purpose, target, uuid.NewString())
		if err != nil {
			t.Fatal(err)
		}
		return c
	}
	proof := func(c *manual.Checkout, ref string) {
		t.Helper()
		if err := r.SubmitManualProof(ctx, 911, c.ID, ref, c.Cards[0].ID, "", ""); err != nil {
			t.Fatal(err)
		}
	}
	var balance int64
	readBalance := func() int64 {
		t.Helper()
		if err := db.QueryRow(ctx, `SELECT wallet_balance FROM users WHERE id=$1`, user).Scan(&balance); err != nil {
			t.Fatal(err)
		}
		return balance
	}
	testPaymentReviewNotifications(t, ctx, db, user, admin, pack)
	testTomanPriceEditors(t, ctx, db, product)
	testPaymentMethodPolicy(t, ctx, db, user, product, pack)
	testCouponCurrencies(t, ctx, db, user, admin, message)
	t.Run("immutable quote idempotent checkout and owner isolation", func(t *testing.T) {
		request := uuid.NewString()
		c, err := r.CreateManualCheckout(ctx, 911, "wallet_topup", pack, request)
		if err != nil {
			t.Fatal(err)
		}
		if err = r.SetManualPrice(ctx, "wallet_topup", pack, 60000); err != nil {
			t.Fatal(err)
		}
		again, err := r.CreateManualCheckout(ctx, 911, "wallet_topup", pack, request)
		if err != nil || again.ID != c.ID || again.Toman != 50000 {
			t.Fatal(again, err)
		}
		if _, err = r.GetManualCheckout(ctx, c.ID, 912); err == nil {
			t.Fatal("cross-user read")
		}
		if err = r.SubmitManualProof(ctx, 912, c.ID, "ref", c.Cards[0].ID, "", ""); err == nil {
			t.Fatal("cross-user proof")
		}
		if _, err = r.ReviewManualPayment(ctx, c.ID, admin, true, ""); err == nil {
			t.Fatal("approved without proof")
		}
		if err = r.CancelManualPayment(ctx, 911, c.ID); err != nil {
			t.Fatal(err)
		}
	})
	t.Run("concurrent approval credits wallet exactly once", func(t *testing.T) {
		c := create("wallet_topup", pack)
		proof(c, "TEST-TOPUP-1")
		if readBalance() != 0 {
			t.Fatal("credit before review")
		}
		var wg sync.WaitGroup
		for i := 0; i < 5; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				if _, err := r.ReviewManualPayment(ctx, c.ID, admin, true, "checked"); err != nil {
					t.Error(err)
				}
			}()
		}
		wg.Wait()
		if readBalance() != 25 {
			t.Fatal("duplicate credit", balance)
		}
		if _, err = r.ReviewManualPayment(ctx, c.ID, admin, false, "reject"); err == nil {
			t.Fatal("reversed approved payment")
		}
	})
	t.Run("duplicate evidence rejected", func(t *testing.T) {
		c := create("wallet_topup", pack)
		if err = r.SubmitManualProof(ctx, 911, c.ID, "TEST-TOPUP-1", c.Cards[0].ID, "", ""); err == nil {
			t.Fatal("replayed proof")
		}
		if err = r.CancelManualPayment(ctx, 911, c.ID); err != nil {
			t.Fatal(err)
		}
	})
	t.Run("product delivery only after approval", func(t *testing.T) {
		c := create("product", product)
		proof(c, "TEST-PRODUCT")
		var status string
		if err = db.QueryRow(ctx, `SELECT status FROM orders WHERE id=$1`, *c.OrderID).Scan(&status); err != nil || status != "pending" {
			t.Fatal(status, err)
		}
		result, err := r.ReviewManualPayment(ctx, c.ID, admin, true, "")
		if err != nil || result.DeliveryID == "" {
			t.Fatal(result, err)
		}
		if err = db.QueryRow(ctx, `SELECT status FROM orders WHERE id=$1`, *c.OrderID).Scan(&status); err != nil || status != "paid" {
			t.Fatal(status, err)
		}
	})
	t.Run("VIP activation", func(t *testing.T) {
		c := create("vip_plan", plan)
		proof(c, "TEST-VIP")
		if _, err = r.ReviewManualPayment(ctx, c.ID, admin, true, ""); err != nil {
			t.Fatal(err)
		}
		var current string
		if err = db.QueryRow(ctx, `SELECT active_plan_id FROM users WHERE id=$1`, user).Scan(&current); err != nil || current != plan {
			t.Fatal(current, err)
		}
	})
	t.Run("rejection never credits", func(t *testing.T) {
		c := create("wallet_topup", pack)
		proof(c, "TEST-REJECT")
		if _, err = r.ReviewManualPayment(ctx, c.ID, admin, false, "not received"); err != nil {
			t.Fatal(err)
		}
		if readBalance() != 25 {
			t.Fatal("credit after rejection")
		}
	})
	t.Run("test mode grants nothing", func(t *testing.T) {
		exec(`UPDATE settings SET payment_test_mode=true`)
		c := create("wallet_topup", pack)
		if !c.IsTest {
			t.Fatal("missing test snapshot")
		}
		proof(c, "TEST-SIMULATION")
		if _, err = r.ReviewManualPayment(ctx, c.ID, admin, true, ""); err != nil {
			t.Fatal(err)
		}
		if readBalance() != 25 {
			t.Fatal("real test credit")
		}
	})
	t.Run("abandoned inventory expires but submitted proof remains reserved", func(t *testing.T) {
		exec(`UPDATE settings SET payment_test_mode=false`)
		inv, item, stockProduct := uuid.NewString(), uuid.NewString(), uuid.NewString()
		exec(`INSERT INTO inventory_items(id,inventory_id,value) VALUES($1,$2,'isolated fixture')`, item, inv)
		exec(`INSERT INTO products(id,title,category_id,stars_price,toman_price,delivery_type,inventory_id,repurchasable) VALUES($1,'Stock test',$2,20,15000,'inventory',$3,true)`, stockProduct, uuid.NewString(), inv)
		c := create("product", stockProduct)
		exec(`UPDATE manual_payment_reviews SET created_at=now()-interval '25 hours' WHERE payment_id=$1`, c.ID)
		if err = r.SubmitManualProof(ctx, 911, c.ID, "TOO-LATE", c.Cards[0].ID, "", ""); err == nil {
			t.Fatal("accepted proof after deadline")
		}
		if err = r.ExpireManualPayments(ctx); err != nil {
			t.Fatal(err)
		}
		var status string
		if err = db.QueryRow(ctx, `SELECT status FROM inventory_items WHERE id=$1`, item).Scan(&status); err != nil || status != "available" {
			t.Fatal(status, err)
		}
		next := create("product", stockProduct)
		proof(next, "SUBMITTED-STOCK")
		exec(`UPDATE manual_payment_reviews SET created_at=now()-interval '25 hours' WHERE payment_id=$1`, next.ID)
		if err = r.ExpireManualPayments(ctx); err != nil {
			t.Fatal(err)
		}
		if err = db.QueryRow(ctx, `SELECT status FROM inventory_items WHERE id=$1`, item).Scan(&status); err != nil || status != "reserved" {
			t.Fatal(status, err)
		}
		if _, err = r.ReviewManualPayment(ctx, next.ID, admin, false, "not received"); err != nil {
			t.Fatal(err)
		}
		if err = db.QueryRow(ctx, `SELECT status FROM inventory_items WHERE id=$1`, item).Scan(&status); err != nil || status != "available" {
			t.Fatal(status, err)
		}
	})
	t.Run("VIP upgrade uses only configured Toman prices", func(t *testing.T) {
		up := uuid.NewString()
		exec(`INSERT INTO vip_plans(id,title,stars_price,duration,tier,toman_price) VALUES($1,'Higher VIP',200,30,2,200000)`, up)
		exec(`UPDATE users SET active_plan_id=$2,has_active_plan=true,plan_expire_at=now()+interval '15 days' WHERE id=$1`, user, plan)
		c := create("vip_plan", up)
		if c.CreditToman < 49990 || c.CreditToman > 50000 || c.Toman != 200000-c.CreditToman {
			t.Fatal("incorrect quote", c.Toman, c.CreditToman)
		}
		proof(c, "VIP-UPGRADE")
		// Concurrent external purchase must not silently be overwritten by approval.
		exec(`UPDATE users SET plan_expire_at=plan_expire_at+interval '1 day' WHERE id=$1`, user)
		if _, err = r.ReviewManualPayment(ctx, c.ID, admin, true, ""); err == nil {
			t.Fatal("stale membership quote approved")
		}
		if _, err = r.ReviewManualPayment(ctx, c.ID, admin, false, "membership changed; contact support for refund"); err != nil {
			t.Fatal(err)
		}
	})
}
