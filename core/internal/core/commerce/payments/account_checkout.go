package payments

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	paymentsmodel "telegram-marketplace/internal/core/commerce/payments/model"
)

// CreateProductCheckout purchases a product using Telegram Stars or the
// user's internal balance. Active VIP users receive VIP products for free.
func (s *Service) CreateProductCheckout(ctx context.Context, telegramID int64, productID, method string) (*CreateStarsInvoiceResponse, error) {
	if method != string(paymentsmodel.MethodTelegramStars) && method != string(paymentsmodel.MethodWallet) {
		return nil, ErrInvalidCheckout
	}

	var vipOnly, hasActiveVIP bool
	err := s.db.QueryRow(ctx, `
		SELECT p.vip_only, (u.has_active_plan AND u.plan_expire_at > now())
		FROM products p CROSS JOIN users u
		WHERE p.id = $1 AND p.status = 'active' AND u.telegram_id = $2`, productID, telegramID,
	).Scan(&vipOnly, &hasActiveVIP)
	if err != nil {
		return nil, ErrCheckoutUnavailable
	}
	if vipOnly && hasActiveVIP {
		return s.createImmediateProductCheckout(ctx, telegramID, productID, true)
	}
	if method == string(paymentsmodel.MethodWallet) {
		return s.createImmediateProductCheckout(ctx, telegramID, productID, false)
	}
	return s.CreateStarsInvoice(ctx, telegramID, productID)
}

func (s *Service) createImmediateProductCheckout(ctx context.Context, telegramID int64, productID string, vipAccess bool) (*CreateStarsInvoiceResponse, error) {
	if err := s.releaseExpiredReservations(ctx); err != nil {
		return nil, err
	}
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var userID string
	var banned, activeVIP bool
	var walletBalance int64
	if err := tx.QueryRow(ctx, `
		SELECT id, is_banned, wallet_balance, (has_active_plan AND plan_expire_at > now())
		FROM users WHERE telegram_id = $1 FOR UPDATE`, telegramID,
	).Scan(&userID, &banned, &walletBalance, &activeVIP); err != nil || banned {
		return nil, ErrCheckoutUnavailable
	}

	var product checkoutProduct
	err = tx.QueryRow(ctx, `
		SELECT id, title, description, stars_price, delivery_type,
		       file_id, message_id, inventory_id, bundle_id, api_id, vip_only, repurchasable
		FROM products WHERE id = $1 AND status = 'active' FOR SHARE`, productID).Scan(
		&product.ID, &product.Title, &product.Description, &product.StarsPrice,
		&product.DeliveryType, &product.FileID, &product.MessageID, &product.InventoryID,
		&product.BundleID, &product.APIID, &product.VIPOnly, &product.Repurchasable,
	)
	if err != nil || (!vipAccess && product.StarsPrice <= 0) || (vipAccess && (!product.VIPOnly || !activeVIP)) {
		return nil, ErrCheckoutUnavailable
	}
	if err := verifyProductPurchaseLimit(ctx, tx, userID, product.ID, product.Repurchasable); err != nil {
		return nil, err
	}

	charge := product.StarsPrice
	paymentMethod := string(paymentsmodel.MethodWallet)
	if vipAccess {
		charge = 0
		paymentMethod = "vip_access"
	} else if walletBalance < charge {
		return nil, ErrInsufficientBalance
	}

	var orderID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO orders (user_id, product_id, quantity, amount, discount_amount, payment_method, status, paid_at, created_at, updated_at)
		VALUES ($1, $2, 1, $3, 0, $4, 'paid', now(), now(), now()) RETURNING id`,
		userID, product.ID, float64(charge), paymentMethod,
	).Scan(&orderID); err != nil {
		return nil, err
	}
	deliveryID, err := s.createDeliverySnapshot(ctx, tx, orderID, userID, product)
	if err != nil {
		return nil, err
	}

	paymentID := ""
	if !vipAccess {
		if err := tx.QueryRow(ctx, `
			INSERT INTO payments (order_id, user_id, purpose, target_id, method, currency, amount_minor,
			 checkout_reference, is_test, status, paid_at, created_at, updated_at)
			VALUES ($1, $2, 'product', $3, 'wallet', 'XTR', $4, $5, false, 'succeeded', now(), now(), now())
			RETURNING id`, orderID, userID, product.ID, charge, "wallet:"+uuid.NewString()).Scan(&paymentID); err != nil {
			return nil, err
		}
		walletBalance, err = s.debitWalletTx(ctx, tx, userID, charge, paymentID, "خرید "+product.Title)
		if err != nil {
			return nil, err
		}
	}
	if err := markProductDeliveredTx(ctx, tx, orderID, deliveryID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	// API delivery persists its own failed state. The purchase itself is already
	// settled, so callers must receive the completed checkout instead of retrying
	// and potentially creating a second paid order.
	_ = s.fulfillAPIDelivery(ctx, deliveryID)
	return &CreateStarsInvoiceResponse{OrderID: orderID, PaymentID: paymentID, Stars: charge, Completed: true, Purpose: "product", WalletBalance: walletBalance}, nil
}

func verifyProductPurchaseLimit(ctx context.Context, tx pgx.Tx, userID, productID string, repurchasable bool) error {
	if repurchasable {
		return nil
	}
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (
		SELECT 1 FROM orders WHERE user_id = $1 AND product_id = $2 AND status IN ('pending','paid')
	)`, userID, productID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return ErrAlreadyPurchased
	}
	return nil
}

func markProductDeliveredTx(ctx context.Context, tx pgx.Tx, orderID, deliveryID string) error {
	if _, err := tx.Exec(ctx, `UPDATE inventory_items SET status = 'sold', sold_at = now(), reserved_at = NULL WHERE order_id = $1 AND status = 'reserved'`, orderID); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `
		UPDATE order_deliveries SET status = CASE WHEN EXISTS (
			SELECT 1 FROM order_delivery_items WHERE delivery_id = $1 AND kind = 'api'
		) THEN 'processing' ELSE 'delivered' END,
		delivered_at = CASE WHEN EXISTS (
			SELECT 1 FROM order_delivery_items WHERE delivery_id = $1 AND kind = 'api'
		) THEN NULL ELSE now() END, updated_at = now() WHERE id = $1`, deliveryID)
	return err
}

// CreateVIPCheckout buys and extends a VIP membership. Wallet purchases settle
// immediately; Stars purchases use the same global test/production setting.
func (s *Service) CreateVIPCheckout(ctx context.Context, telegramID int64, planID, method string) (*CreateStarsInvoiceResponse, error) {
	if method != string(paymentsmodel.MethodTelegramStars) && method != string(paymentsmodel.MethodWallet) {
		return nil, ErrInvalidCheckout
	}
	var title string
	var stars int64
	var duration int
	if err := s.db.QueryRow(ctx, `SELECT title, stars_price, duration FROM vip_plans WHERE id = $1 AND status = 'active'`, planID).Scan(&title, &stars, &duration); err != nil || stars <= 0 {
		return nil, ErrCheckoutUnavailable
	}
	checkoutData := string(mustJSON(map[string]any{"plan_title": title, "duration_days": duration, "stars_price": stars}))

	if method == string(paymentsmodel.MethodTelegramStars) {
		return s.createStandaloneStarsInvoice(ctx, telegramID, "vip_plan", &planID, stars, title, fmt.Sprintf("اشتراک VIP برای %d روز", duration), checkoutData)
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var userID string
	var balance int64
	var banned bool
	if err := tx.QueryRow(ctx, `SELECT id, wallet_balance, is_banned FROM users WHERE telegram_id = $1 FOR UPDATE`, telegramID).Scan(&userID, &balance, &banned); err != nil || banned {
		return nil, ErrCheckoutUnavailable
	}
	if balance < stars {
		return nil, ErrInsufficientBalance
	}
	var paymentID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO payments (user_id, purpose, target_id, method, currency, amount_minor, checkout_reference,
		 checkout_data, is_test, status, paid_at, created_at, updated_at)
		VALUES ($1, 'vip_plan', $2, 'wallet', 'XTR', $3, $4, $5::jsonb, false, 'succeeded', now(), now(), now()) RETURNING id`,
		userID, planID, stars, "wallet:"+uuid.NewString(), checkoutData,
	).Scan(&paymentID); err != nil {
		return nil, err
	}
	balance, err = s.debitWalletTx(ctx, tx, userID, stars, paymentID, "خرید "+title)
	if err != nil {
		return nil, err
	}
	if err := s.activateVIPTx(ctx, tx, userID, planID, paymentID, string(paymentsmodel.MethodWallet)); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &CreateStarsInvoiceResponse{PaymentID: paymentID, Stars: stars, Completed: true, Purpose: "vip_plan", WalletBalance: balance}, nil
}

// CreateWalletTopup creates a Stars invoice whose settlement credits the wallet.
func (s *Service) CreateWalletTopup(ctx context.Context, telegramID, stars int64) (*CreateStarsInvoiceResponse, error) {
	if stars <= 0 {
		return nil, ErrInvalidCheckout
	}
	return s.createStandaloneStarsInvoice(ctx, telegramID, "wallet_topup", nil, stars, "شارژ کیف پول", fmt.Sprintf("افزایش موجودی کیف پول به اندازه %d استار", stars), `{}`)
}

func (s *Service) createStandaloneStarsInvoice(ctx context.Context, telegramID int64, purpose string, targetID *string, stars int64, title, description, checkoutData string) (*CreateStarsInvoiceResponse, error) {
	if s.db == nil || s.invoices == nil {
		return nil, errors.New("stars checkout is not configured")
	}
	config, err := s.GetPaymentConfig(ctx)
	if err != nil {
		return nil, err
	}
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var userID string
	var banned bool
	if err := tx.QueryRow(ctx, `SELECT id, is_banned FROM users WHERE telegram_id = $1 FOR UPDATE`, telegramID).Scan(&userID, &banned); err != nil || banned {
		return nil, ErrCheckoutUnavailable
	}
	reference := uuid.NewString()
	var paymentID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO payments (user_id, purpose, target_id, method, currency, amount_minor, checkout_reference,
		 checkout_data, is_test, status, created_at, updated_at)
		VALUES ($1, $2, $3, 'telegram_stars', 'XTR', $4, $5, $6::jsonb, $7, 'pending', now(), now()) RETURNING id`,
		userID, purpose, targetID, stars, reference, checkoutData, config.TestMode,
	).Scan(&paymentID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	if config.TestMode {
		return &CreateStarsInvoiceResponse{PaymentID: paymentID, Stars: stars, SimulationEnabled: true, Purpose: purpose}, nil
	}
	invoiceTitle := strings.TrimSpace(title)
	if len([]rune(invoiceTitle)) > 32 {
		invoiceTitle = string([]rune(invoiceTitle)[:32])
	}
	if len([]rune(description)) > 255 {
		description = string([]rune(description)[:255])
	}
	invoiceURL, err := s.invoices.CreateInvoiceLink(ctx, invoiceTitle, description, reference, paymentsmodel.StarsCurrency, stars)
	if err != nil {
		_ = s.failStandalonePayment(ctx, paymentID, "telegram invoice creation failed")
		return nil, err
	}
	return &CreateStarsInvoiceResponse{PaymentID: paymentID, InvoiceURL: invoiceURL, Stars: stars, Purpose: purpose}, nil
}

func (s *Service) activateVIPTx(ctx context.Context, tx pgx.Tx, userID, planID, paymentID, method string) error {
	var title string
	var duration int
	var stars int64
	if err := tx.QueryRow(ctx, `
		SELECT checkout_data->>'plan_title', (checkout_data->>'duration_days')::int,
		       (checkout_data->>'stars_price')::bigint
		FROM payments WHERE id = $1`, paymentID,
	).Scan(&title, &duration, &stars); err != nil || duration <= 0 {
		return ErrInvalidCheckout
	}
	var startsAt, expiresAt time.Time
	if err := tx.QueryRow(ctx, `
		SELECT GREATEST(now(), COALESCE(plan_expire_at, now())),
		       GREATEST(now(), COALESCE(plan_expire_at, now())) + ($2 * interval '1 day')
		FROM users WHERE id = $1 FOR UPDATE`, userID, duration,
	).Scan(&startsAt, &expiresAt); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO user_vip_subscriptions (user_id, plan_id, plan_title, duration_days, stars_price,
		 payment_id, payment_method, starts_at, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (payment_id) DO NOTHING`, userID, planID, title, duration, stars, paymentID, method, startsAt, expiresAt); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `UPDATE users SET has_active_plan = true, active_plan_id = $2, plan_expire_at = $3 WHERE id = $1`, userID, planID, expiresAt)
	return err
}

func (s *Service) debitWalletTx(ctx context.Context, tx pgx.Tx, userID string, amount int64, paymentID, description string) (int64, error) {
	var before, after int64
	if err := tx.QueryRow(ctx, `SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&before); err != nil {
		return 0, err
	}
	if before < amount {
		return before, ErrInsufficientBalance
	}
	after = before - amount
	if _, err := tx.Exec(ctx, `UPDATE users SET wallet_balance = $2 WHERE id = $1`, userID, after); err != nil {
		return before, err
	}
	_, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, payment_id, description) VALUES ($1, 'purchase', $2, $3, $4, $5, $6)`, userID, amount, before, after, paymentID, description)
	return after, err
}

func (s *Service) creditWalletTx(ctx context.Context, tx pgx.Tx, userID string, amount int64, paymentID, description string) error {
	var before int64
	if err := tx.QueryRow(ctx, `SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&before); err != nil {
		return err
	}
	after := before + amount
	if _, err := tx.Exec(ctx, `UPDATE users SET wallet_balance = $2 WHERE id = $1`, userID, after); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, payment_id, description) VALUES ($1, 'topup', $2, $3, $4, $5, $6) ON CONFLICT (payment_id) DO NOTHING`, userID, amount, before, after, paymentID, description)
	return err
}

func (s *Service) failStandalonePayment(ctx context.Context, paymentID, reason string) error {
	_, err := s.db.Exec(ctx, `UPDATE payments SET status = 'failed', provider_data = $2::jsonb, updated_at = now() WHERE id = $1 AND status = 'pending'`, paymentID, string(mustJSON(map[string]string{"error": reason})))
	return err
}

func (s *Service) walletBalanceByTelegramID(ctx context.Context, telegramID int64) (int64, error) {
	var balance int64
	err := s.db.QueryRow(ctx, `SELECT wallet_balance FROM users WHERE telegram_id = $1`, telegramID).Scan(&balance)
	return balance, err
}

func (s *Service) Wallet(ctx context.Context, telegramID int64) (*WalletResponse, error) {
	var userID string
	var response WalletResponse
	if err := s.db.QueryRow(ctx, `SELECT id, wallet_balance FROM users WHERE telegram_id = $1`, telegramID).Scan(&userID, &response.Balance); err != nil {
		return nil, ErrInvalidCheckout
	}
	rows, err := s.db.Query(ctx, `SELECT id, type, amount, balance_before, balance_after, description, created_at FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	response.Transactions = []WalletTransactionResponse{}
	for rows.Next() {
		var item WalletTransactionResponse
		if err := rows.Scan(&item.ID, &item.Type, &item.Amount, &item.BalanceBefore, &item.BalanceAfter, &item.Description, &item.CreatedAt); err != nil {
			return nil, err
		}
		response.Transactions = append(response.Transactions, item)
	}
	return &response, rows.Err()
}
