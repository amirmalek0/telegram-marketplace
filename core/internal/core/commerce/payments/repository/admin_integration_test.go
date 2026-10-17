package repository

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"strings"
	"telegram-marketplace/internal/core/commerce/payments/model"
	"testing"
)

// Only schema definitions are copied; all rows and cleanup stay in the isolated schema.
func TestAdminPaymentsPostgres(t *testing.T) {
	url := os.Getenv("COUPON_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set COUPON_TEST_DATABASE_URL for isolated payment tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := "payment_admin_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
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
	for _, table := range []string{"users", "products", "orders", "payments", "order_deliveries", "vip_plans", "wallet_topup_packs"} {
		id := pgx.Identifier{table}.Sanitize()
		exec("CREATE TABLE " + id + " (LIKE public." + id + " INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)")
	}
	repo := NewPostgresRepository(db)
	empty, err := repo.AdminSummary(ctx, model.MethodTelegramStars)
	if err != nil || *empty != (model.Summary{}) {
		t.Fatalf("empty summary: %+v %v", empty, err)
	}
	user, product, order, plan, pack := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	exec(`INSERT INTO users(id,telegram_id,first_name,last_name,username) VALUES($1,6740172206,'Amir','Test','amir')`, user)
	exec(`INSERT INTO products(id,title,category_id,stars_price,delivery_type) VALUES($1,'Renamed product',$2,50,'file')`, product, uuid.NewString())
	exec(`INSERT INTO orders(id,user_id,product_id,quantity,amount,discount_amount,coupon_code) VALUES($1,$2,$3,2,50,10,'SAVE10')`, order, user, product)
	exec(`INSERT INTO order_deliveries(order_id,user_id,product_id,product_title) VALUES($1,$2,$3,'Original product')`, order, user, product)
	exec(`INSERT INTO vip_plans(id,title,duration) VALUES($1,'Renamed VIP',30)`, plan)
	exec(`INSERT INTO wallet_topup_packs(id,title,stars) VALUES($1,'Renamed pack',100)`, pack)
	ids := []string{}
	add := func(purpose string, target, orderID *string, method model.PaymentMethod, status string, isTest bool, amount int64, data string, owner string) string {
		id := uuid.NewString()
		exec(`INSERT INTO payments(id,user_id,order_id,purpose,target_id,method,currency,amount_minor,checkout_reference,status,is_test,checkout_data,external_transaction_id,provider_transaction_id,provider_data)
  VALUES($1,$2,$3,$4,$5,$6,'XTR',$7,$8,$9,$10,$11::jsonb,$12,$13,'{"private":"not for DTO"}')`,
			id, owner, orderID, purpose, target, method, amount, "ref:"+id, status, isTest, data, "tg:"+id, "provider:"+id)
		if method == model.MethodTelegramStars {
			ids = append(ids, id)
		}
		return id
	}
	productPayment := add("product", &product, &order, model.MethodTelegramStars, "succeeded", false, 40, "{}", user)
	vipPayment := add("vip_plan", &plan, nil, model.MethodTelegramStars, "succeeded", true, 200, `{"plan_title":"Original VIP"}`, user)
	packPayment := add("wallet_topup", &pack, nil, model.MethodTelegramStars, "pending", false, 100, `{"pack_title":"Original pack"}`, user)
	missing := uuid.NewString()
	missingPayment := add("product", &missing, nil, model.MethodTelegramStars, "failed", false, 10, "{}", missing)
	add("wallet_topup", &pack, nil, model.MethodTelegramStars, "refunded", false, 100, "{}", user)
	add("product", &product, &order, model.MethodWallet, "succeeded", false, 999, "{}", user)
	summary, err := repo.AdminSummary(ctx, model.MethodTelegramStars)
	if err != nil || *summary != (model.Summary{Total: 5, Succeeded: 2, Pending: 1, Failed: 1, Refunded: 1, TestTotal: 1, PaidStars: 40}) {
		t.Fatalf("summary: %+v %v", summary, err)
	}
	rows, err := repo.ListAdminByMethod(ctx, model.MethodTelegramStars, 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 5 {
		t.Fatalf("row count %d", len(rows))
	}
	byID := map[string]model.AdminPayment{}
	for _, row := range rows {
		byID[row.ID] = row
	}
	paid := byID[productPayment]
	if paid.User == nil || paid.User.TelegramID != 6740172206 || paid.User.FirstName != "Amir" || paid.TargetTitle != "Original product" || paid.Quantity != 2 || paid.CouponCode != "SAVE10" || paid.DiscountStars != 10 || paid.ProductID == nil || *paid.ProductID != product {
		t.Fatalf("enrichment: %+v", paid)
	}
	if paid.ExternalTransactionID == nil || *paid.ExternalTransactionID != "tg:"+productPayment || paid.ProviderTransactionID == nil || *paid.ProviderTransactionID != "provider:"+productPayment {
		t.Fatal("transaction IDs changed")
	}
	if byID[vipPayment].TargetTitle != "Original VIP" || byID[packPayment].TargetTitle != "Original pack" {
		t.Fatal("snapshot title not preferred")
	}
	if byID[missingPayment].User != nil || byID[missingPayment].TargetTitle != "محصول حذف‌شده" {
		t.Fatal("missing relations dropped or misrepresented")
	}
	// Pagination covers every attempt exactly once, irrespective of shared timestamps.
	seen := map[string]bool{}
	for offset := 0; offset < 5; offset++ {
		page, err := repo.ListAdminByMethod(ctx, model.MethodTelegramStars, 1, offset)
		if err != nil || len(page) != 1 {
			t.Fatalf("page: %+v %v", page, err)
		}
		if seen[page[0].ID] {
			t.Fatal("duplicate payment across pages")
		}
		seen[page[0].ID] = true
	}
	for _, id := range ids {
		if !seen[id] {
			t.Fatalf("missing payment %s", id)
		}
	}
	exec("DELETE FROM products WHERE id=$1", product)
	exec("DELETE FROM vip_plans WHERE id=$1", plan)
	exec("DELETE FROM wallet_topup_packs WHERE id=$1", pack)
	rows, err = repo.ListAdminByMethod(ctx, model.MethodTelegramStars, 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	for _, row := range rows {
		if row.ID == productPayment && row.TargetTitle != "Original product" {
			t.Fatal("lost purchased product title")
		}
		if row.ID == vipPayment && row.TargetTitle != "Original VIP" {
			t.Fatal("lost purchased VIP title")
		}
		if row.ID == packPayment && row.TargetTitle != "Original pack" {
			t.Fatal("lost purchased pack title")
		}
	}
}
