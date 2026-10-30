package database

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	productsrepo "telegram-marketplace/internal/core/catalog/products/repository"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	vipmodel "telegram-marketplace/internal/core/membership/vip/model"
	viprepo "telegram-marketplace/internal/core/membership/vip/repository"
	"testing"
	"time"
)

func testTomanPriceEditors(t *testing.T, ctx context.Context, db *pgxpool.Pool, sourceProduct string) {
	t.Run("product editor round trips Toman and method overrides", func(t *testing.T) {
		r := productsrepo.NewPostgresRepository(db)
		p, err := r.GetByID(ctx, sourceProduct)
		if err != nil {
			t.Fatal(err)
		}
		p.ID, p.Title, p.TomanPrice = "", "Editor test", 65000
		p.PaymentMethodsOverride, p.StarsEnabled, p.CardToCardEnabled = true, false, true
		if err = r.Create(ctx, p); err != nil {
			t.Fatal(err)
		}
		defer r.Delete(ctx, p.ID)
		got, err := r.GetByID(ctx, p.ID)
		if err != nil || got.TomanPrice != 65000 || !got.PaymentMethodsOverride || got.StarsEnabled || !got.CardToCardEnabled {
			t.Fatal(got, err)
		}
		got.TomanPrice, got.PaymentMethodsOverride = 0, false
		if err = r.Update(ctx, got); err != nil {
			t.Fatal(err)
		}
		rows, err := r.List(ctx, 100, 0)
		if err != nil {
			t.Fatal(err)
		}
		for _, item := range rows {
			if item.ID == got.ID {
				if item.TomanPrice != 0 || item.PaymentMethodsOverride {
					t.Fatal(item)
				}
				return
			}
		}
		t.Fatal("created product absent from list")
	})
	t.Run("VIP editor round trips Toman", func(t *testing.T) {
		r := viprepo.NewPostgresRepository(db)
		plan := &vipmodel.Plan{Title: "Editor VIP", StarsPrice: 30, TomanPrice: 75000, Duration: 30, Tier: 1, Status: vipmodel.StatusActive, CreatedAt: time.Now()}
		if err := r.Create(ctx, plan); err != nil {
			t.Fatal(err)
		}
		defer r.Delete(ctx, plan.ID)
		got, err := r.GetByID(ctx, plan.ID)
		if err != nil || got.TomanPrice != plan.TomanPrice {
			t.Fatal(got, err)
		}
		got.TomanPrice = 0
		if err = r.Update(ctx, got); err != nil {
			t.Fatal(err)
		}
		got, err = r.GetByID(ctx, plan.ID)
		if err != nil || got.TomanPrice != 0 {
			t.Fatal(got, err)
		}
		if _, err = r.List(ctx, 100, 0); err != nil {
			t.Fatal(err)
		}
	})
	t.Run("wallet pack editor round trips Toman", func(t *testing.T) {
		r := paymentsrepo.NewPostgresRepository(db)
		pack, err := r.CreateWalletTopupPack(ctx, paymentsrepo.WalletTopupPack{Title: "Editor pack", Stars: 50, TomanPrice: 95000, Status: "active"})
		if err != nil || pack.TomanPrice != 95000 {
			t.Fatal(pack, err)
		}
		defer r.DeleteWalletTopupPack(ctx, pack.ID)
		pack.TomanPrice = 0
		got, err := r.UpdateWalletTopupPack(ctx, *pack)
		if err != nil || got.TomanPrice != 0 {
			t.Fatal(got, err)
		}
		got, err = r.GetActiveWalletTopupPack(ctx, pack.ID)
		if err != nil || got.TomanPrice != 0 {
			t.Fatal(got, err)
		}
		if _, err = r.ListWalletTopupPacks(ctx, false); err != nil {
			t.Fatal(err)
		}
	})
}
