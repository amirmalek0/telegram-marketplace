package database

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/commerce/payments/manual"
	repo "telegram-marketplace/internal/core/commerce/payments/repository"
	"testing"
)

func testPaymentMethodPolicy(t *testing.T, ctx context.Context, db *pgxpool.Pool, user, product, pack string) {
	t.Helper()
	t.Run("payment policy inheritance overrides and legacy settlement", func(t *testing.T) {
		r := repo.NewPostgresRepository(db)
		methods := r.(repo.MethodRepository)
		manualRepo := r.(repo.ManualRepository)
		save := func(stars, card bool) {
			t.Helper()
			value, err := methods.PaymentMethods(ctx, "")
			if err != nil {
				t.Fatal(err)
			}
			value.Stars, value.CardToCard = stars, card
			if _, err = methods.SavePaymentMethods(ctx, *value); err != nil {
				t.Fatal(err)
			}
			if _, err = methods.SavePaymentMethods(ctx, *value); !errors.Is(err, manual.ErrConflict) {
				t.Fatalf("stale config accepted: %v", err)
			}
		}
		setProduct := func(override, stars, card bool) {
			t.Helper()
			if _, err := db.Exec(ctx, `UPDATE products SET payment_methods_override=$2,stars_enabled=$3,card_to_card_enabled=$4 WHERE id=$1`, product, override, stars, card); err != nil {
				t.Fatal(err)
			}
		}
		defer func() { save(true, true); setProduct(false, true, false) }()
		save(false, false)
		value, err := methods.PaymentMethods(ctx, product)
		if err != nil || value.Stars || value.CardToCard {
			t.Fatal(value, err)
		}
		if _, err = r.CreateProductStarsCheckout(ctx, 911, product, uuid.NewString(), false, ""); !errors.Is(err, repo.ErrCheckoutUnavailable) {
			t.Fatalf("disabled product Stars: %v", err)
		}
		for _, purpose := range []string{"wallet_topup", "vip_plan"} {
			if _, err = r.CreateStandalonePayment(ctx, repo.StandalonePaymentInput{TelegramID: 911, Purpose: purpose, TargetID: &pack, Stars: 25, CheckoutReference: uuid.NewString(), CheckoutData: `{}`}); !errors.Is(err, repo.ErrCheckoutUnavailable) {
				t.Fatalf("disabled %s Stars: %v", purpose, err)
			}
			if _, err = manualRepo.CreateManualCheckout(ctx, 911, purpose, pack, uuid.NewString()); !errors.Is(err, repo.ErrCheckoutUnavailable) {
				t.Fatalf("disabled %s card: %v", purpose, err)
			}
		}
		if _, err = manualRepo.ManualPrice(ctx, "product", product); !errors.Is(err, manual.ErrUnavailable) {
			t.Fatalf("disabled price visible: %v", err)
		}
		setProduct(true, true, false)
		value, err = methods.PaymentMethods(ctx, product)
		if err != nil || !value.Stars || value.CardToCard {
			t.Fatal(value, err)
		}
		stars, err := r.CreateProductStarsCheckout(ctx, 911, product, uuid.NewString(), false, "")
		if err != nil {
			t.Fatal(err)
		}
		if err = r.FailCheckout(ctx, stars.OrderID, stars.PaymentID, "test cleanup", true); err != nil {
			t.Fatal(err)
		}
		setProduct(true, false, true)
		if _, err = manualRepo.ManualPrice(ctx, "product", product); err != nil {
			t.Fatal(err)
		}
		c, err := manualRepo.CreateManualCheckout(ctx, 911, "product", product, uuid.NewString())
		if err != nil {
			t.Fatal(err)
		}
		// Disabling a method must not orphan an already-created bank transfer.
		setProduct(false, true, false)
		if err = manualRepo.SubmitManualProof(ctx, 911, c.ID, "POLICY-EXISTING", c.Cards[0].ID, "", ""); err != nil {
			t.Fatal(err)
		}
		var adminID string
		if err = db.QueryRow(ctx, `SELECT id FROM admins LIMIT 1`).Scan(&adminID); err != nil {
			t.Fatal(err)
		}
		if _, err = manualRepo.ReviewManualPayment(ctx, c.ID, adminID, true, "verified"); err != nil {
			t.Fatal(err)
		}
		// Saving a stale/deprecated 'enabled' field in card configuration cannot enable payments.
		config, err := manualRepo.ManualConfig(ctx)
		if err != nil {
			t.Fatal(err)
		}
		config.Enabled = true
		if _, err = manualRepo.SaveManualConfig(ctx, *config, adminID); err != nil {
			t.Fatal(err)
		}
		value, err = methods.PaymentMethods(ctx, "")
		if err != nil || value.CardToCard {
			t.Fatal("card editor changed global policy", value, err)
		}
	})
}
