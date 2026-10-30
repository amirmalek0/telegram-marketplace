package database

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/commerce/coupons"
	couponrepo "telegram-marketplace/internal/core/commerce/coupons/repository"
	"telegram-marketplace/internal/core/commerce/payments/manual"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"testing"
)

// Called with the isolated schema from TestManualPaymentLifecyclePostgres.
func testCouponCurrencies(t *testing.T, ctx context.Context, db *pgxpool.Pool, user, admin, message string) {
	t.Run("currency coupons through quote reservation and settlement", func(t *testing.T) {
		exec := func(q string, args ...any) {
			t.Helper()
			if _, err := db.Exec(ctx, q, args...); err != nil {
				t.Fatal(err)
			}
		}
		product := uuid.NewString()
		exec(`INSERT INTO products(id,title,category_id,stars_price,toman_price,delivery_type,message_id,repurchasable) VALUES($1,'Currency test',$2,20,150000,'message',$3,true)`, product, uuid.NewString(), message)
		service := coupons.NewService(couponrepo.NewPostgresRepository(db))
		coupon, err := service.Create(ctx, coupons.CreateRequest{Code: "BOTH-CURRENCY", CurrencyScope: "both", DiscountType: "static", DiscountValue: 5, TomanDiscountType: "static", TomanDiscountValue: 50000, UsageLimit: 1, ProductIDs: []string{product}, UserIDs: []string{user}})
		if err != nil {
			t.Fatal(err)
		}
		for _, currency := range []string{"stars", "toman"} {
			q, e := service.Validate(ctx, 911, coupons.ValidateRequest{Code: coupon.Code, ProductID: product, Currency: currency})
			if e != nil || !q.Valid {
				t.Fatal(q, e)
			}
			if currency == "stars" && q.PayableStars != 15 || currency == "toman" && q.PayableToman != 100000 {
				t.Fatal(q)
			}
		}
		base := paymentsrepo.NewPostgresRepository(db)
		repo := base.(paymentsrepo.ManualRepository)
		create := func(code string) *manual.Checkout {
			t.Helper()
			p, e := repo.CreateManualCheckout(ctx, 911, "product", product, uuid.NewString(), code)
			if e != nil {
				t.Fatal(e)
			}
			return p
		}
		used := func(want int) {
			t.Helper()
			var n int
			if e := db.QueryRow(ctx, `SELECT usage_count FROM coupons WHERE id=$1`, coupon.ID).Scan(&n); e != nil || n != want {
				t.Fatal(n, want, e)
			}
		}
		p := create(coupon.Code)
		if p.Toman != 100000 || p.OriginalToman != 150000 || p.DiscountToman != 50000 || p.CouponCode != coupon.Code {
			t.Fatal(p)
		}
		used(0)
		if _, e := base.CreateProductStarsCheckout(ctx, 911, product, uuid.NewString(), false, coupon.Code); e == nil {
			t.Fatal("manual reservation did not block Stars")
		}
		if e := repo.CancelManualPayment(ctx, 911, p.ID); e != nil {
			t.Fatal(e)
		}
		p = create(coupon.Code)
		if e := repo.SubmitManualProof(ctx, 911, p.ID, "COUPON-REJECT", p.Cards[0].ID, "", ""); e != nil {
			t.Fatal(e)
		}
		if _, e := repo.ReviewManualPayment(ctx, p.ID, admin, false, "not received"); e != nil {
			t.Fatal(e)
		}
		used(0)
		request := uuid.NewString()
		p, err = repo.CreateManualCheckout(ctx, 911, "product", product, request, coupon.Code)
		if err != nil {
			t.Fatal(err)
		}
		again, e := repo.CreateManualCheckout(ctx, 911, "product", product, request, coupon.Code)
		if e != nil || again.ID != p.ID {
			t.Fatal(again, e)
		}
		if _, e = repo.CreateManualCheckout(ctx, 911, "product", product, request, ""); e == nil {
			t.Fatal("idempotency accepted changed coupon")
		}
		if e = repo.SubmitManualProof(ctx, 911, p.ID, "COUPON-APPROVE", p.Cards[0].ID, "", ""); e != nil {
			t.Fatal(e)
		}
		// Review honors the reserved price even if the admin changes the coupon.
		exec(`UPDATE coupons SET is_active=false,toman_discount_value=1 WHERE id=$1`, coupon.ID)
		for i := 0; i < 2; i++ {
			if _, e = repo.ReviewManualPayment(ctx, p.ID, admin, true, ""); e != nil {
				t.Fatal(e)
			}
		}
		used(1)
		exec(`UPDATE coupons SET is_active=true WHERE id=$1`, coupon.ID)
		if _, e = repo.CreateManualCheckout(ctx, 911, "product", product, uuid.NewString(), coupon.Code); e == nil {
			t.Fatal("exhausted coupon accepted")
		}
		only, e := service.Create(ctx, coupons.CreateRequest{Code: "TOMAN-ONLY", CurrencyScope: "toman", TomanDiscountType: "percentage", TomanDiscountValue: 100, ProductIDs: []string{product}})
		if e != nil {
			t.Fatal(e)
		}
		if _, e = base.CreateProductStarsCheckout(ctx, 911, product, uuid.NewString(), false, only.Code); e == nil {
			t.Fatal("Toman coupon accepted for Stars")
		}
		if _, e = repo.CreateManualCheckout(ctx, 911, "vip_plan", uuid.NewString(), uuid.NewString(), only.Code); e == nil {
			t.Fatal("product coupon accepted for VIP")
		}
		request = uuid.NewString()
		free, e := repo.CreateManualCheckout(ctx, 911, "product", product, request, only.Code)
		if e != nil || free.Status != "approved" || free.Toman != 0 || free.DeliveryID == "" {
			t.Fatal(free, e)
		}
		freeAgain, e := repo.CreateManualCheckout(ctx, 911, "product", product, request, only.Code)
		if e != nil || freeAgain.ID != free.ID || freeAgain.DeliveryID != free.DeliveryID {
			t.Fatal(freeAgain, e)
		}
		var n int
		if e = db.QueryRow(ctx, `SELECT usage_count FROM coupons WHERE id=$1`, only.ID).Scan(&n); e != nil || n != 1 {
			t.Fatal(n, e)
		}
		// Restart migrations must accept existing free orders and keep review safeguards.
		for _, q := range securityMigrations {
			exec(q)
		}
		for _, q := range couponCurrencyMigrations {
			exec(q)
		}
		exec(`UPDATE settings SET payment_test_mode=true`)
		simulated := create(only.Code)
		if !simulated.IsTest || simulated.Status != "approved" || simulated.DeliveryID != "" {
			t.Fatal(simulated)
		}
		if e = db.QueryRow(ctx, `SELECT usage_count FROM coupons WHERE id=$1`, only.ID).Scan(&n); e != nil || n != 1 {
			t.Fatal("test consumed coupon", n, e)
		}
		var status string
		if e = db.QueryRow(ctx, `SELECT status FROM orders WHERE id=$1`, *simulated.OrderID).Scan(&status); e != nil || status != "failed" {
			t.Fatal(status, e)
		}
		exec(`UPDATE settings SET payment_test_mode=false`)
		// Legacy Stars-only coupons still reject Toman checkout.
		stars, e := service.Create(ctx, coupons.CreateRequest{Code: "STARS-LEGACY", DiscountType: "static", DiscountValue: 5})
		if e != nil {
			t.Fatal(e)
		}
		if _, e = repo.CreateManualCheckout(ctx, 911, "product", product, uuid.NewString(), stars.Code); e == nil {
			t.Fatal("Stars-only coupon accepted for Toman")
		}
	})
}
