package repository

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"strings"
	"sync"
	"testing"
)

func TestPaymentSecurityPostgres(t *testing.T) {
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
	schema := "security_checkout_" + strings.ReplaceAll(uuid.NewString(), "-", "")
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
	for _, table := range []string{"users", "products", "delivery_messages", "apis", "orders", "payments", "order_deliveries", "order_delivery_items", "coupons", "wallet_transactions", "inventory_items", "vip_plans", "user_vip_subscriptions"} {
		q := pgx.Identifier{table}.Sanitize()
		exec("CREATE TABLE " + q + " (LIKE public." + q + " INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)")
	}
	exec(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS precheckout_accepted_at TIMESTAMPTZ`)
	exec(`ALTER TABLE payments DROP CONSTRAINT payments_amount_minor_check`)
	exec(`ALTER TABLE payments ADD CONSTRAINT payments_amount_minor_check CHECK(amount_minor>0 OR (is_test AND amount_minor=0))`)
	exec(`CREATE TABLE payment_refunds(charge_id TEXT PRIMARY KEY,checkout_reference TEXT NOT NULL,telegram_id BIGINT NOT NULL,completed_at TIMESTAMPTZ)`)
	exec(`CREATE TABLE settings(id UUID PRIMARY KEY,payment_test_mode BOOLEAN,updated_at TIMESTAMPTZ DEFAULT now())`)
	exec(`INSERT INTO settings VALUES('00000000-0000-0000-0000-000000000001',true,now())`)
	user, product, api := uuid.NewString(), uuid.NewString(), uuid.NewString()
	exec(`INSERT INTO users(id,telegram_id,wallet_balance) VALUES($1,42,100)`, user)
	exec(`INSERT INTO apis(id,name,url,method) VALUES($1,'Security test','https://example.invalid','GET')`, api)
	exec(`INSERT INTO products(id,title,category_id,stars_price,delivery_type,api_id) VALUES($1,'Security test',$2,20,'api',$3)`, product, uuid.NewString(), api)
	r := NewPostgresRepository(db)
	create := func() *CheckoutRecord {
		t.Helper()
		x, e := r.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), false, "")
		if e != nil {
			t.Fatal(e)
		}
		return x
	}
	input := func(x *CheckoutRecord) SettlementInput {
		return SettlementInput{TelegramID: 42, Currency: "XTR", TotalAmount: x.Stars, InvoicePayload: x.CheckoutReference, TelegramChargeID: "security-" + x.PaymentID, Raw: []byte(`{}`)}
	}
	t.Run("replay resumes delivery and expired leases recover", func(t *testing.T) {
		x := create()
		first, e := r.SettleStarsPayment(ctx, input(x))
		if e != nil || first.DeliveryID == "" {
			t.Fatal(first, e)
		}
		retry, e := r.SettleStarsPayment(ctx, input(x))
		if e != nil || retry.DeliveryID != first.DeliveryID {
			t.Fatal(retry, e)
		}
		items, e := r.ListPendingAPIDeliveryItems(ctx, first.DeliveryID)
		if e != nil || len(items) != 1 {
			t.Fatal(items, e)
		}
		var wg sync.WaitGroup
		claims := make(chan bool, 2)
		for i := 0; i < 2; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				ok, err := r.ClaimAPIDeliveryItem(ctx, items[0].ID)
				if err != nil {
					t.Error(err)
				}
				claims <- ok
			}()
		}
		wg.Wait()
		close(claims)
		count := 0
		for ok := range claims {
			if ok {
				count++
			}
		}
		if count != 1 {
			t.Fatal("duplicate claim", count)
		}
		exec(`UPDATE order_delivery_items SET updated_at=now()-interval '3 minutes' WHERE id=$1`, items[0].ID)
		recovered, e := r.ListPendingAPIDeliveryItems(ctx, first.DeliveryID)
		if e != nil || len(recovered) != 1 {
			t.Fatal(recovered, e)
		}
		if ok, e := r.ClaimAPIDeliveryItem(ctx, items[0].ID); e != nil || !ok {
			t.Fatal("lease not recovered", e)
		}
		if e := r.CompleteAPIDeliveryItem(ctx, items[0].ID, "delivered"); e != nil {
			t.Fatal(e)
		}
		if e := r.CompleteAPIDelivery(ctx, first.DeliveryID); e != nil {
			t.Fatal(e)
		}
	})
	t.Run("expired precheckout rejected but approved payment pinned", func(t *testing.T) {
		expired := create()
		exec(`UPDATE payments SET created_at=now()-interval '31 minutes' WHERE id=$1`, expired.PaymentID)
		if e := r.ValidatePreCheckout(ctx, 42, expired.CheckoutReference, "XTR", 20); !errors.Is(e, ErrInvalidCheckout) {
			t.Fatal(e)
		}
		approved := create()
		if e := r.ValidatePreCheckout(ctx, 42, approved.CheckoutReference, "XTR", 20); e != nil {
			t.Fatal(e)
		}
		exec(`UPDATE payments SET created_at=now()-interval '31 minutes' WHERE id=$1`, approved.PaymentID)
		if e := r.ReleaseExpiredReservations(ctx); e != nil {
			t.Fatal(e)
		}
		if _, e := r.SettleStarsPayment(ctx, input(approved)); e != nil {
			t.Fatal("approved payment expired", e)
		}
		if _, e := r.SettleStarsPayment(ctx, input(expired)); !errors.Is(e, ErrInvalidCheckout) {
			t.Fatal(e)
		}
		if e := r.PrepareRefund(ctx, expired.CheckoutReference, "refund-charge", 42); e != nil {
			t.Fatal(e)
		}
		// Even if an operator reopens the checkout after a provider refund,
		// persisted intent prevents a retry from granting the refunded purchase.
		exec(`UPDATE payments SET status='pending' WHERE id=$1`, expired.PaymentID)
		refundedInput := input(expired)
		refundedInput.TelegramChargeID = "refund-charge"
		if _, e := r.SettleStarsPayment(ctx, refundedInput); !errors.Is(e, ErrInvalidCheckout) {
			t.Fatal("refund intent ignored", e)
		}
		if e := r.RecordRefund(ctx, expired.CheckoutReference, "refund-charge", 42); e != nil {
			t.Fatal(e)
		}
		var status string
		if e := db.QueryRow(ctx, "SELECT status FROM payments WHERE id=$1", expired.PaymentID).Scan(&status); e != nil || status != "refunded" {
			t.Fatal(status, e)
		}
	})
	t.Run("test purchases fulfill once through normal settlement", func(t *testing.T) {
		beforeOrders := 0
		if err := db.QueryRow(ctx, "SELECT count(*) FROM orders").Scan(&beforeOrders); err != nil {
			t.Fatal(err)
		}
		testProduct, e := r.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), true, "")
		if e != nil || testProduct.OrderID == "" || testProduct.DeliveryID == "" {
			t.Fatal("test checkout must create an order and delivery", testProduct, e)
		}
		cases := []*CheckoutRecord{testProduct}
		exec(`INSERT INTO coupons(code,discount_type,discount_value) VALUES('FREE_SECURITY','static',20)`)
		free, e := r.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), true, "FREE_SECURITY")
		if e != nil || !free.Completed || free.Stars != 0 || free.OrderID == "" || free.PaymentID != "" {
			t.Fatal("fully discounted checkout must fulfill immediately", free, e)
		}
		plan := uuid.NewString()
		exec(`INSERT INTO vip_plans(id,title,duration,stars_price) VALUES($1,'Test VIP',30,100)`, plan)
		for _, purpose := range []string{"wallet_topup", "vip_plan"} {
			x, e := r.CreateStandalonePayment(ctx, StandalonePaymentInput{TelegramID: 42, Purpose: purpose, TargetID: &plan, Stars: 100, CheckoutReference: uuid.NewString(), CheckoutData: `{"plan_title":"Test VIP","duration_days":30,"stars_price":100}`, TestMode: true})
			if e != nil {
				t.Fatal(e)
			}
			cases = append(cases, x)
		}
		for _, x := range cases {
			in := input(x)
			in.TelegramChargeID = "test:" + uuid.NewString()
			for attempt := 0; attempt < 2; attempt++ {
				result, e := r.SettleStarsPayment(ctx, in)
				if e != nil {
					t.Fatal(e)
				}
				if x.OrderID != "" && (result.ReferenceID != x.OrderID || result.DeliveryID != x.DeliveryID) {
					t.Fatal("test product delivery missing", result)
				}
			}
		}
		balance, e := r.WalletBalanceByTelegramID(ctx, 42)
		if e != nil || balance != 200 {
			t.Fatal("test must credit wallet exactly once", balance, e)
		}
		var active bool
		var orders, subscriptions int
		if e := db.QueryRow(ctx, "SELECT has_active_plan AND plan_expire_at>now() FROM users WHERE id=$1", user).Scan(&active); e != nil || !active {
			t.Fatal("test must activate VIP", e)
		}
		if e := db.QueryRow(ctx, "SELECT count(*) FROM orders").Scan(&orders); e != nil || orders != beforeOrders+2 {
			t.Fatal("test must create real orders", orders, e)
		}
		if e := db.QueryRow(ctx, "SELECT count(*) FROM user_vip_subscriptions").Scan(&subscriptions); e != nil || subscriptions != 1 {
			t.Fatal("test must create one subscription", subscriptions, e)
		}
		var paid bool
		if e := db.QueryRow(ctx, "SELECT status='paid' FROM orders WHERE id=$1", testProduct.OrderID).Scan(&paid); e != nil || !paid {
			t.Fatal("test order not paid", e)
		}
		// Restored test entitlements also count toward one-time purchase limits.
		exec(`UPDATE products SET repurchasable=false WHERE id=$1`, product)
		if _, e := r.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), true, ""); e == nil {
			t.Fatal("test purchase bypassed purchase limit")
		}
		exec(`UPDATE products SET repurchasable=true WHERE id=$1`, product)
		for _, cancelled := range []bool{false, true} {
			x, e := r.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), true, "")
			if e != nil {
				t.Fatal(e)
			}
			if e := r.FailCheckout(ctx, x.OrderID, x.PaymentID, "simulated failure", cancelled); e != nil {
				t.Fatal(e)
			}
			in := input(x)
			in.TelegramChargeID = "test:" + uuid.NewString()
			if _, e := r.SettleStarsPayment(ctx, in); !errors.Is(e, ErrInvalidCheckout) {
				t.Fatal("failed/cancelled checkout was fulfilled", e)
			}
		}
		pending, e := r.CreateStandalonePayment(ctx, StandalonePaymentInput{TelegramID: 42, Purpose: "wallet_topup", Stars: 100, CheckoutReference: uuid.NewString(), CheckoutData: `{}`, TestMode: true})
		if e != nil {
			t.Fatal(e)
		}
		exec(`UPDATE settings SET payment_test_mode=false`)
		in := input(pending)
		in.TelegramChargeID = "test:" + uuid.NewString()
		if _, e := r.SettleStarsPayment(ctx, in); !errors.Is(e, ErrInvalidCheckout) {
			t.Fatal("disabled test accepted", e)
		}
	})
}
