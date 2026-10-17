package repository

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"strings"
	"telegram-marketplace/internal/core/commerce/coupons"
	couponmodel "telegram-marketplace/internal/core/commerce/coupons/model"
	couponrepo "telegram-marketplace/internal/core/commerce/coupons/repository"
	ordersdomain "telegram-marketplace/internal/core/commerce/orders"
	ordermodel "telegram-marketplace/internal/core/commerce/orders/model"
	ordersrepo "telegram-marketplace/internal/core/commerce/orders/repository"
	usersrepo "telegram-marketplace/internal/core/membership/users/repository"
	"telegram-marketplace/pkg/pagination"
	"testing"
)

// Clone table definitions (never customer data) into a disposable schema.
func TestCouponCheckoutPostgres(t *testing.T) {
	url := os.Getenv("COUPON_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set COUPON_TEST_DATABASE_URL for isolated checkout tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := "coupon_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
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
	for _, table := range []string{"users", "products", "delivery_messages", "orders", "payments", "order_deliveries", "order_delivery_items", "coupons", "wallet_transactions", "inventory_items"} {
		id := pgx.Identifier{table}.Sanitize()
		exec("CREATE TABLE " + id + " (LIKE public." + id + " INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)")
	}
	exec(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT NOT NULL DEFAULT ''`)
	exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT ''`)
	exec(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS user_ids JSONB NOT NULL DEFAULT '[]'::jsonb`)
	empty, err := couponrepo.NewPostgresRepository(db).Summary(ctx)
	if err != nil || empty != (couponmodel.Summary{}) {
		t.Fatalf("empty summary: %+v %v", empty, err)
	}
	user, product, message := uuid.NewString(), uuid.NewString(), uuid.NewString()
	exec(`INSERT INTO users(id,telegram_id,wallet_balance) VALUES($1,42,100)`, user)
	exec(`INSERT INTO delivery_messages(id,name,content) VALUES($1,'Demo','delivered content')`, message)
	exec(`INSERT INTO products(id,title,category_id,stars_price,delivery_type,message_id) VALUES($1,'Coupon test',$2,20,'message',$3)`, product, uuid.NewString(), message)
	addCoupon := func(code string, value int, limit int) {
		exec(`INSERT INTO coupons(code,discount_type,discount_value,usage_limit,product_ids) VALUES($1,'static',$2,$3,$4)`, code, value, limit, []string{product})
	}
	repo := NewPostgresRepository(db)
	orders := ordersrepo.NewPostgresRepository(db)
	check := func(orderID, code string, stars, discount int64) {
		t.Helper()
		o, err := orders.GetByID(ctx, orderID)
		if err != nil || o.Stars != stars || o.CouponCode != code || int64(o.DiscountAmount) != discount {
			t.Fatalf("order price/scan: %+v %v", o, err)
		}
	}
	addCoupon("SAVE5", 5, 0)
	wallet, err := repo.CreateImmediateProductCheckout(ctx, 42, product, uuid.NewString(), false, "SAVE5")
	if err != nil || wallet.Stars != 15 || wallet.WalletBalance != 85 {
		t.Fatalf("wallet checkout %+v %v", wallet, err)
	}
	check(wallet.OrderID, "SAVE5", 15, 5)
	addCoupon("FREE", 20, 0)
	free, err := repo.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), false, "FREE")
	if err != nil || !free.Completed || free.PaymentID != "" || free.Stars != 0 {
		t.Fatalf("free checkout %+v %v", free, err)
	}
	check(free.OrderID, "FREE", 0, 20)
	var delivered string
	if err = db.QueryRow(ctx, `SELECT status FROM order_deliveries WHERE order_id=$1`, free.OrderID).Scan(&delivered); err != nil || delivered != "delivered" {
		t.Fatal("free delivery not unlocked", delivered, err)
	}
	addCoupon("LAST", 5, 1)
	pending, err := repo.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), true, "LAST")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), true, "LAST"); err == nil {
		t.Fatal("pending reservation failed to enforce limit")
	}
	if err = repo.FailCheckout(ctx, pending.OrderID, pending.PaymentID, "cancelled", true); err != nil {
		t.Fatal(err)
	}
	pending, err = repo.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), true, "LAST")
	if err != nil {
		t.Fatal("cancel did not release coupon", err)
	}
	input := SettlementInput{TelegramID: 42, Currency: "XTR", TotalAmount: 15, InvoicePayload: pending.CheckoutReference, TelegramChargeID: "test:" + uuid.NewString(), Raw: []byte(`{}`)}
	for i := 0; i < 2; i++ {
		if _, err = repo.SettleStarsPayment(ctx, input); err != nil {
			t.Fatal(err)
		}
	}
	var used int
	if err = db.QueryRow(ctx, `SELECT usage_count FROM coupons WHERE code='LAST'`).Scan(&used); err != nil || used != 1 {
		t.Fatal("settlement counted twice", used, err)
	}
	check(pending.OrderID, "LAST", 15, 5)
	if _, err = orders.ListByUserID(ctx, user, 20, 0); err != nil {
		t.Fatal(err)
	}
	if _, err = orders.ListAll(ctx, 20, 0); err != nil {
		t.Fatal(err)
	}
	addCoupon("INACTIVE", 5, 0)
	exec(`UPDATE coupons SET is_active=false WHERE code='INACTIVE'`)
	if _, err = repo.CreateImmediateProductCheckout(ctx, 42, product, uuid.NewString(), false, "INACTIVE"); err == nil {
		t.Fatal("inactive coupon accepted at checkout")
	}

	t.Run("user restrictions in validation and every checkout", func(t *testing.T) {
		userDenied := func(err error) bool {
			var couponErr *CouponError
			return errors.As(err, &couponErr) && couponErr.Message == couponmodel.ErrCouponUserNotApplicable.Error()
		}
		other := uuid.NewString()
		exec(`INSERT INTO users(id,telegram_id,wallet_balance) VALUES($1,43,100)`, other)
		service := coupons.NewService(couponrepo.NewPostgresRepository(db))
		targeted, err := service.Create(ctx, coupons.CreateRequest{Code: "PRIVATE", DiscountType: "static", DiscountValue: 5, UserIDs: []string{user, user}})
		if err != nil || len(targeted.UserIDs) != 1 {
			t.Fatalf("create/deduplicate: %+v %v", targeted, err)
		}
		stored, err := service.GetByID(ctx, targeted.ID)
		if err != nil || len(stored.UserIDs) != 1 || stored.UserIDs[0] != user {
			t.Fatalf("roundtrip: %+v %v", stored, err)
		}
		for _, ids := range [][]string{{"bad"}, {uuid.NewString()}, {uuid.Nil.String()}} {
			if _, err := service.Update(ctx, targeted.ID, coupons.UpdateRequest{UserIDs: &ids}); err == nil {
				t.Fatal("invalid or missing user accepted")
			}
		}
		unchanged, err := service.Update(ctx, targeted.ID, coupons.UpdateRequest{})
		if err != nil || len(unchanged.UserIDs) != 1 {
			t.Fatalf("omitted scope reset: %+v %v", unchanged, err)
		}
		for _, tg := range []int64{42, 43} {
			quote, err := service.Validate(ctx, tg, coupons.ValidateRequest{Code: "PRIVATE", ProductID: product})
			if err != nil || quote.Valid != (tg == 42) {
				t.Fatalf("quote %d: %+v %v", tg, quote, err)
			}
			encoded, _ := json.Marshal(quote)
			if strings.Contains(string(encoded), "user_ids") || strings.Contains(string(encoded), user) {
				t.Fatal("target users leaked")
			}
		}
		count := func() int {
			var n int
			if err := db.QueryRow(ctx, `SELECT COUNT(*) FROM orders`).Scan(&n); err != nil {
				t.Fatal(err)
			}
			return n
		}
		before := count()
		for _, amount := range []int{5, 20} {
			exec(`UPDATE coupons SET discount_value=$1 WHERE id=$2`, amount, targeted.ID)
			_, starsErr := repo.CreateProductStarsCheckout(ctx, 43, product, uuid.NewString(), false, "PRIVATE")
			_, walletErr := repo.CreateImmediateProductCheckout(ctx, 43, product, uuid.NewString(), false, "PRIVATE")
			if !userDenied(starsErr) || !userDenied(walletErr) {
				t.Fatalf("unauthorized checkout: %v / %v", starsErr, walletErr)
			}
		}
		if count() != before {
			t.Fatal("rejected checkout created an order")
		}
		var balance int
		if err := db.QueryRow(ctx, `SELECT wallet_balance FROM users WHERE id=$1`, other).Scan(&balance); err != nil || balance != 100 {
			t.Fatal("rejected checkout changed wallet", balance, err)
		}
		if err := db.QueryRow(ctx, `SELECT usage_count FROM coupons WHERE id=$1`, targeted.ID).Scan(&used); err != nil || used != 0 {
			t.Fatal("rejected checkout consumed coupon", used, err)
		}
		allowed, err := repo.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), false, "PRIVATE")
		if err != nil || !allowed.Completed {
			t.Fatalf("selected user checkout failed: %+v %v", allowed, err)
		}
		// A previously valid quote cannot authorize checkout after an admin changes the audience.
		ids := []string{other}
		if _, err := service.Update(ctx, targeted.ID, coupons.UpdateRequest{UserIDs: &ids}); err != nil {
			t.Fatal(err)
		}
		if _, err := repo.CreateImmediateProductCheckout(ctx, 42, product, uuid.NewString(), false, "PRIVATE"); !userDenied(err) {
			t.Fatal("old quote bypassed audience change", err)
		}
		// Deletion must not silently broaden the coupon to everyone.
		exec(`DELETE FROM users WHERE id=$1`, other)
		if _, err := repo.CreateProductStarsCheckout(ctx, 42, product, uuid.NewString(), false, "PRIVATE"); !userDenied(err) {
			t.Fatal("deleted target broadened audience", err)
		}
		ids = []string{}
		cleared, err := service.Update(ctx, targeted.ID, coupons.UpdateRequest{UserIDs: &ids})
		if err != nil || len(cleared.UserIDs) != 0 {
			t.Fatal("explicit all-users update failed", err)
		}
		quote, err := service.Validate(ctx, 42, coupons.ValidateRequest{Code: "PRIVATE", ProductID: product})
		if err != nil || !quote.Valid {
			t.Fatal("all-users coupon rejected", err)
		}
	})

	t.Run("global summary ignores pagination and includes disabled expired coupons", func(t *testing.T) {
		couponsRepo := couponrepo.NewPostgresRepository(db)
		before, err := couponsRepo.Summary(ctx)
		if err != nil {
			t.Fatal(err)
		}
		exec(`INSERT INTO coupons(code,discount_type,discount_value,is_active,expires_at,usage_limit,usage_count) VALUES
   ('STATS_FOREVER','static',1,true,NULL,0,0),
   ('STATS_FUTURE','static',1,true,now()+interval '1 day',0,0),
   ('STATS_CAPACITY','static',1,true,NULL,2,1),
   ('STATS_EXPIRED','static',1,true,now()-interval '1 day',0,0),
   ('STATS_DISABLED_EXPIRED','static',1,false,now()-interval '1 day',0,0),
   ('STATS_DISABLED','static',1,false,NULL,0,0),
   ('STATS_EXHAUSTED','static',1,true,NULL,2,2)`)
		want := couponmodel.Summary{Active: before.Active + 3, Expired: before.Expired + 2, Total: before.Total + 7}
		service := coupons.NewService(couponsRepo)
		for _, page := range []int{1, 2, 99} {
			result, err := service.List(ctx, pagination.Params{Page: page, PerPage: 1})
			if err != nil {
				t.Fatal(err)
			}
			if result.Summary != want || result.Total != want.Total || len(result.Data) > 1 {
				t.Fatalf("page %d summary: %+v want %+v", page, result, want)
			}
		}
		exec(`UPDATE coupons SET is_active=false WHERE code='STATS_FOREVER'`)
		want.Active--
		got, err := couponsRepo.Summary(ctx)
		if err != nil || got != want {
			t.Fatalf("toggle summary: %+v %v want %+v", got, err, want)
		}
		exec(`DELETE FROM coupons WHERE code='STATS_EXPIRED'`)
		want.Expired--
		want.Total--
		got, err = couponsRepo.Summary(ctx)
		if err != nil || got != want {
			t.Fatalf("delete summary: %+v %v want %+v", got, err, want)
		}
	})

	t.Run("admin order identity historical details and global totals", func(t *testing.T) {
		exec(`UPDATE users SET first_name='Amir',last_name='Demo',username='demo_admin_test' WHERE id=$1`, user)
		exec(`UPDATE products SET title='Renamed product' WHERE id=$1`, product)
		exec(`DELETE FROM coupons WHERE code='SAVE5'`)
		list, err := orders.ListAll(ctx, 100, 0)
		if err != nil || len(list) == 0 {
			t.Fatalf("list admin orders: %v", err)
		}
		var want ordermodel.Summary
		found := false
		for _, order := range list {
			if order.User == nil || order.User.ID != user || order.User.FirstName != "Amir" || order.User.Username != "demo_admin_test" || order.User.TelegramID != 42 {
				t.Fatalf("buyer missing: %+v", order.User)
			}
			if order.ProductTitle != "Coupon test" {
				t.Fatal("lost historical product title", order.ProductTitle)
			}
			if order.ID == wallet.OrderID {
				found = true
				if order.CouponCode != "SAVE5" || order.DiscountAmount != 5 || order.Stars != 15 {
					t.Fatalf("lost coupon snapshot: %+v", order)
				}
			}
			want.Total++
			if order.Status == ordermodel.StatusPaid {
				want.Paid++
				want.PaidStars += order.Stars
			}
			if order.Status == ordermodel.StatusPending {
				want.Pending++
			}
		}
		if !found {
			t.Fatal("wallet order disappeared")
		}
		service := ordersdomain.NewService(orders, usersrepo.NewPostgresRepository(db))
		for _, page := range []int{1, 2, 99} {
			result, err := service.ListAll(ctx, pagination.Params{Page: page, PerPage: 1})
			if err != nil || result.Summary != want || result.Total != want.Total || len(result.Data) > 1 {
				t.Fatalf("summary page %d: %+v %v want %+v", page, result, err, want)
			}
		}
		shopper, err := service.ListByTelegramID(ctx, 42, pagination.Params{Page: 1, PerPage: 100})
		if err != nil {
			t.Fatal(err)
		}
		encoded, _ := json.Marshal(shopper)
		if strings.Contains(string(encoded), "demo_admin_test") || strings.Contains(string(encoded), "telegram_id") || strings.Contains(string(encoded), "\"user\":") {
			t.Fatal("admin identity leaked into shopper response")
		}
		// Missing account must not hide the historical order.
		exec(`DELETE FROM users WHERE id=$1`, user)
		orphaned, err := orders.ListAll(ctx, 100, 0)
		if err != nil || len(orphaned) != len(list) {
			t.Fatal("missing user hid orders", err)
		}
		for _, order := range orphaned {
			if order.User != nil {
				t.Fatal("deleted buyer was not null")
			}
		}
	})
}
