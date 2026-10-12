package payments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	paymentsmodel "telegram-marketplace/internal/core/commerce/payments/model"
)

var (
	ErrCheckoutUnavailable = errors.New("checkout is unavailable for this product")
	ErrOutOfStock          = errors.New("product is out of stock")
	ErrInvalidCheckout     = errors.New("checkout is no longer valid")
)

type checkoutProduct struct {
	ID           string
	Title        string
	Description  string
	Price        float64
	StarsPrice   int64
	DeliveryType string
	FileID       *string
	MessageID    *string
	InventoryID  *string
	BundleID     *string
	APIID        *string
}

// CreateStarsInvoice creates the pending order/payment and its delivery
// snapshot in one transaction, then asks Telegram for the native invoice URL.
func (s *Service) CreateStarsInvoice(ctx context.Context, telegramID int64, productID string) (*CreateStarsInvoiceResponse, error) {
	if s.db == nil || s.invoices == nil {
		return nil, errors.New("stars checkout is not configured")
	}
	if err := s.releaseExpiredReservations(ctx); err != nil {
		return nil, fmt.Errorf("payments checkout release expired reservations: %w", err)
	}
	paymentConfig, err := s.GetPaymentConfig(ctx)
	if err != nil {
		return nil, err
	}
	testMode := paymentConfig.TestMode

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("payments checkout begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var userID string
	var banned bool
	if err := tx.QueryRow(ctx, `SELECT id, is_banned FROM users WHERE telegram_id = $1`, telegramID).Scan(&userID, &banned); err != nil {
		return nil, ErrInvalidCheckout
	}
	if banned {
		return nil, ErrCheckoutUnavailable
	}

	var product checkoutProduct
	err = tx.QueryRow(ctx, `
		SELECT id, title, description, price, stars_price, delivery_type,
		       file_id, message_id, inventory_id, bundle_id, api_id
		FROM products WHERE id = $1 AND status = 'active' FOR SHARE`, productID).Scan(
		&product.ID, &product.Title, &product.Description, &product.Price, &product.StarsPrice,
		&product.DeliveryType, &product.FileID, &product.MessageID, &product.InventoryID,
		&product.BundleID, &product.APIID,
	)
	if err != nil || product.StarsPrice <= 0 {
		return nil, ErrCheckoutUnavailable
	}

	var orderID string
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (user_id, product_id, quantity, amount, discount_amount, payment_method, status, created_at, updated_at)
		VALUES ($1, $2, 1, $3, 0, $4, 'pending', now(), now()) RETURNING id`,
		userID, product.ID, product.Price, string(paymentsmodel.MethodTelegramStars),
	).Scan(&orderID)
	if err != nil {
		return nil, fmt.Errorf("payments checkout create order: %w", err)
	}

	checkoutReference := uuid.NewString()
	var paymentID string
	err = tx.QueryRow(ctx, `
		INSERT INTO payments (order_id, method, currency, amount_minor, checkout_reference, is_test, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', now(), now()) RETURNING id`,
		orderID, string(paymentsmodel.MethodTelegramStars), paymentsmodel.StarsCurrency,
		product.StarsPrice, checkoutReference, testMode,
	).Scan(&paymentID)
	if err != nil {
		return nil, fmt.Errorf("payments checkout create payment: %w", err)
	}

	deliveryID, err := s.createDeliverySnapshot(ctx, tx, orderID, userID, product)
	if err != nil {
		return nil, err
	}
	_ = deliveryID

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("payments checkout commit: %w", err)
	}

	if testMode {
		return &CreateStarsInvoiceResponse{
			OrderID: orderID, PaymentID: paymentID, InvoiceURL: "",
			Stars: product.StarsPrice, Currency: paymentsmodel.StarsCurrency,
			SimulationEnabled: true,
		}, nil
	}

	description := strings.TrimSpace(product.Description)
	if description == "" {
		description = "خرید " + product.Title
	}
	if len([]rune(description)) > 255 {
		description = string([]rune(description)[:255])
	}
	invoiceTitle := strings.TrimSpace(product.Title)
	if len([]rune(invoiceTitle)) > 32 {
		invoiceTitle = string([]rune(invoiceTitle)[:32])
	}
	invoiceURL, err := s.invoices.CreateInvoiceLink(
		ctx, invoiceTitle, description, checkoutReference, paymentsmodel.StarsCurrency, product.StarsPrice,
	)
	if err != nil {
		_ = s.failCheckout(ctx, orderID, paymentID, "telegram invoice creation failed")
		return nil, fmt.Errorf("payments checkout create invoice: %w", err)
	}

	return &CreateStarsInvoiceResponse{
		OrderID: orderID, PaymentID: paymentID, InvoiceURL: invoiceURL,
		Stars: product.StarsPrice, Currency: paymentsmodel.StarsCurrency,
		SimulationEnabled: false,
	}, nil
}

// SimulateStarsPayment exercises the real settlement/failure paths without
// trusting a forged Telegram update. Only payments created while the admin
// payment mode was set to test can use this path.
func (s *Service) SimulateStarsPayment(ctx context.Context, telegramID int64, paymentID, outcome string) (*SimulateStarsPaymentResponse, error) {
	var orderID, payload, currency, status string
	var amount int64
	err := s.db.QueryRow(ctx, `
		SELECT p.order_id, p.checkout_reference, p.currency, p.amount_minor, p.status
		FROM payments p
		JOIN orders o ON o.id = p.order_id
		JOIN users u ON u.id = o.user_id
		WHERE p.id = $1 AND p.method = $2 AND u.telegram_id = $3 AND p.is_test = true`,
		paymentID, string(paymentsmodel.MethodTelegramStars), telegramID,
	).Scan(&orderID, &payload, &currency, &amount, &status)
	if err != nil || status != "pending" {
		return nil, ErrInvalidCheckout
	}

	switch outcome {
	case "succeeded":
		raw := mustJSON(map[string]any{"simulated": true, "outcome": outcome, "payment_id": paymentID})
		settledOrderID, settleErr := s.SettleStarsPayment(ctx, SuccessfulPaymentInput{
			TelegramID: telegramID, Currency: currency, TotalAmount: amount,
			InvoicePayload: payload, TelegramChargeID: "test:" + uuid.NewString(), Raw: raw,
		})
		if settleErr != nil {
			if settledOrderID != "" {
				return &SimulateStarsPaymentResponse{
					OrderID: settledOrderID, Status: "succeeded",
					DeliveryStatus: "failed", DeliveryError: settleErr.Error(),
				}, nil
			}
			return nil, settleErr
		}
		deliveryStatus, deliveryError := s.deliveryOutcome(ctx, settledOrderID)
		return &SimulateStarsPaymentResponse{
			OrderID: settledOrderID, Status: "succeeded",
			DeliveryStatus: deliveryStatus, DeliveryError: deliveryError,
		}, nil
	case "failed", "cancelled":
		if err := s.failCheckout(ctx, orderID, paymentID, "simulated "+outcome); err != nil {
			return nil, err
		}
		if outcome == "cancelled" {
			_, _ = s.db.Exec(ctx, `UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1 AND status = 'failed'`, orderID)
		}
		return &SimulateStarsPaymentResponse{OrderID: orderID, Status: outcome}, nil
	default:
		return nil, ErrInvalidCheckout
	}
}

func (s *Service) deliveryOutcome(ctx context.Context, orderID string) (string, string) {
	var status string
	var deliveryError *string
	if err := s.db.QueryRow(ctx, `SELECT status, error FROM order_deliveries WHERE order_id = $1`, orderID).Scan(&status, &deliveryError); err != nil {
		return "", ""
	}
	if deliveryError == nil {
		return status, ""
	}
	return status, *deliveryError
}

func (s *Service) createDeliverySnapshot(ctx context.Context, tx pgx.Tx, orderID, userID string, product checkoutProduct) (string, error) {
	var deliveryID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO order_deliveries (order_id, user_id, product_id, product_title)
		VALUES ($1, $2, $3, $4) RETURNING id`, orderID, userID, product.ID, product.Title,
	).Scan(&deliveryID); err != nil {
		return "", fmt.Errorf("payments checkout create delivery: %w", err)
	}

	addFile := func(fileID string, sortOrder int) error {
		tag, err := tx.Exec(ctx, `
			INSERT INTO order_delivery_items (delivery_id, kind, label, file_id, status, sort_order)
			SELECT $1, 'file', name, id, 'ready', $3 FROM files WHERE id = $2`, deliveryID, fileID, sortOrder)
		if err != nil || tag.RowsAffected() != 1 {
			return ErrCheckoutUnavailable
		}
		return nil
	}
	addMessage := func(messageID string, sortOrder int) error {
		tag, err := tx.Exec(ctx, `
			INSERT INTO order_delivery_items (delivery_id, kind, label, content, status, sort_order)
			SELECT $1, 'message', 'اطلاعات محصول', content, 'ready', $3 FROM delivery_messages WHERE id = $2`, deliveryID, messageID, sortOrder)
		if err != nil || tag.RowsAffected() != 1 {
			return ErrCheckoutUnavailable
		}
		return nil
	}
	addInventory := func(inventoryID string, sortOrder int) error {
		var value string
		err := tx.QueryRow(ctx, `
			UPDATE inventory_items SET status = 'reserved', reserved_at = now(), order_id = $2, user_id = $3
			WHERE id = (
				SELECT id FROM inventory_items WHERE inventory_id = $1 AND status = 'available'
				ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
			) RETURNING value`, inventoryID, orderID, userID).Scan(&value)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrOutOfStock
		}
		if err != nil {
			return fmt.Errorf("payments checkout reserve inventory: %w", err)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO order_delivery_items (delivery_id, kind, label, content, status, sort_order)
			VALUES ($1, 'inventory', 'اطلاعات اختصاصی', $2, 'ready', $3)`, deliveryID, value, sortOrder)
		return err
	}

	switch product.DeliveryType {
	case "file":
		if product.FileID == nil {
			return "", ErrCheckoutUnavailable
		}
		if err := addFile(*product.FileID, 0); err != nil {
			return "", err
		}
	case "message":
		if product.MessageID == nil {
			return "", ErrCheckoutUnavailable
		}
		if err := addMessage(*product.MessageID, 0); err != nil {
			return "", err
		}
	case "inventory":
		if product.InventoryID == nil {
			return "", ErrCheckoutUnavailable
		}
		if err := addInventory(*product.InventoryID, 0); err != nil {
			return "", err
		}
	case "bundle":
		if product.BundleID == nil {
			return "", ErrCheckoutUnavailable
		}
		var fileID, messageID, inventoryID *string
		if err := tx.QueryRow(ctx, `SELECT file_id, message_id, inventory_id FROM bundles WHERE id = $1`, *product.BundleID).Scan(&fileID, &messageID, &inventoryID); err != nil {
			return "", ErrCheckoutUnavailable
		}
		sortOrder := 0
		if fileID != nil {
			if err := addFile(*fileID, sortOrder); err != nil {
				return "", err
			}
			sortOrder++
		}
		if messageID != nil {
			if err := addMessage(*messageID, sortOrder); err != nil {
				return "", err
			}
			sortOrder++
		}
		if inventoryID != nil {
			if err := addInventory(*inventoryID, sortOrder); err != nil {
				return "", err
			}
		}
	case "api":
		if product.APIID == nil {
			return "", ErrCheckoutUnavailable
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO order_delivery_items (delivery_id, kind, label, api_id, status, sort_order)
			SELECT $1, 'api', COALESCE(NULLIF(name, ''), 'تحویل خودکار'), id, 'pending', 0 FROM apis WHERE id = $2`, deliveryID, *product.APIID)
		if err != nil || tag.RowsAffected() != 1 {
			return "", ErrCheckoutUnavailable
		}
	default:
		return "", ErrCheckoutUnavailable
	}
	return deliveryID, nil
}

func (s *Service) failCheckout(ctx context.Context, orderID, paymentID, reason string) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `UPDATE payments SET status = 'failed', updated_at = now(), provider_data = $2::jsonb WHERE id = $1 AND status = 'pending'`, paymentID, string(mustJSON(map[string]string{"error": reason}))); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE orders SET status = 'failed', updated_at = now() WHERE id = $1 AND status = 'pending'`, orderID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE order_deliveries SET status = 'failed', error = $2, updated_at = now() WHERE order_id = $1`, orderID, reason); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE inventory_items SET status = 'available', reserved_at = NULL, order_id = NULL, user_id = NULL WHERE order_id = $1 AND status = 'reserved'`, orderID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Service) releaseExpiredReservations(ctx context.Context) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	const expiredOrderIDs = `SELECT order_id FROM payments WHERE method = 'telegram_stars' AND status = 'pending' AND created_at < now() - interval '30 minutes'`
	if _, err = tx.Exec(ctx, `UPDATE orders SET status = 'cancelled', updated_at = now() WHERE status = 'pending' AND id IN (`+expiredOrderIDs+`)`); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE order_deliveries SET status = 'failed', error = 'checkout expired', updated_at = now() WHERE status = 'awaiting_payment' AND order_id IN (`+expiredOrderIDs+`)`); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE inventory_items SET status = 'available', reserved_at = NULL, order_id = NULL, user_id = NULL WHERE status = 'reserved' AND order_id IN (`+expiredOrderIDs+`)`); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE payments SET status = 'failed', provider_data = '{"error":"checkout expired"}'::jsonb, updated_at = now() WHERE method = 'telegram_stars' AND status = 'pending' AND created_at < now() - interval '30 minutes'`); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func mustJSON(value any) []byte {
	data, _ := json.Marshal(value)
	return data
}

// ValidatePreCheckout rechecks the authoritative amount, currency, owner, and
// reservation immediately before Telegram accepts the payment.
func (s *Service) ValidatePreCheckout(ctx context.Context, telegramID int64, payload, currency string, amount int64) error {
	var storedCurrency, status, orderStatus string
	var storedAmount int64
	var ownerTelegramID int64
	err := s.db.QueryRow(ctx, `
		SELECT p.currency, p.amount_minor, p.status, o.status, u.telegram_id
		FROM payments p JOIN orders o ON o.id = p.order_id JOIN users u ON u.id = o.user_id
		WHERE p.checkout_reference = $1 AND p.method = $2 AND p.is_test = false`, payload, string(paymentsmodel.MethodTelegramStars),
	).Scan(&storedCurrency, &storedAmount, &status, &orderStatus, &ownerTelegramID)
	if err != nil || status != "pending" || orderStatus != "pending" || ownerTelegramID != telegramID || storedCurrency != currency || storedAmount != amount {
		return ErrInvalidCheckout
	}
	return nil
}

type SuccessfulPaymentInput struct {
	TelegramID       int64
	ChatID           int64
	Currency         string
	TotalAmount      int64
	InvoicePayload   string
	TelegramChargeID string
	ProviderChargeID string
	Raw              []byte
}

// SettleStarsPayment is idempotent. Telegram's successful_payment update is
// the only path that can mark an order paid and unlock its delivery.
func (s *Service) SettleStarsPayment(ctx context.Context, input SuccessfulPaymentInput) (string, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var paymentID, orderID, deliveryID, currency, paymentStatus, orderStatus string
	var isTest bool
	var existingChargeID *string
	var amount int64
	var ownerTelegramID int64
	err = tx.QueryRow(ctx, `
		SELECT p.id, p.order_id, d.id, p.currency, p.amount_minor, p.is_test, p.status, o.status, u.telegram_id, p.external_transaction_id
		FROM payments p
		JOIN orders o ON o.id = p.order_id
		JOIN users u ON u.id = o.user_id
		JOIN order_deliveries d ON d.order_id = o.id
		WHERE p.checkout_reference = $1 AND p.method = $2
		FOR UPDATE OF p, o, d`, input.InvoicePayload, string(paymentsmodel.MethodTelegramStars),
	).Scan(&paymentID, &orderID, &deliveryID, &currency, &amount, &isTest, &paymentStatus, &orderStatus, &ownerTelegramID, &existingChargeID)
	if err != nil || ownerTelegramID != input.TelegramID || currency != input.Currency || amount != input.TotalAmount {
		return "", ErrInvalidCheckout
	}
	if isTest != strings.HasPrefix(input.TelegramChargeID, "test:") {
		return "", ErrInvalidCheckout
	}

	if paymentStatus == "pending" && orderStatus == "pending" {
		if _, err = tx.Exec(ctx, `
			UPDATE payments SET status = 'succeeded', external_transaction_id = $2,
			provider_transaction_id = NULLIF($3, ''), provider_data = $4, paid_at = now(), updated_at = now()
			WHERE id = $1`, paymentID, input.TelegramChargeID, input.ProviderChargeID, input.Raw); err != nil {
			return "", err
		}
		if _, err = tx.Exec(ctx, `UPDATE orders SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = $1`, orderID); err != nil {
			return "", err
		}
		if _, err = tx.Exec(ctx, `UPDATE inventory_items SET status = 'sold', sold_at = now(), reserved_at = NULL WHERE order_id = $1 AND status = 'reserved'`, orderID); err != nil {
			return "", err
		}
		if _, err = tx.Exec(ctx, `
			UPDATE order_deliveries SET status = CASE WHEN EXISTS (
				SELECT 1 FROM order_delivery_items WHERE delivery_id = $1 AND kind = 'api'
			) THEN 'processing' ELSE 'delivered' END,
			delivered_at = CASE WHEN EXISTS (
				SELECT 1 FROM order_delivery_items WHERE delivery_id = $1 AND kind = 'api'
			) THEN NULL ELSE now() END, updated_at = now() WHERE id = $1`, deliveryID); err != nil {
			return "", err
		}
	} else if paymentStatus != "succeeded" || orderStatus != "paid" || existingChargeID == nil || *existingChargeID != input.TelegramChargeID {
		return "", ErrInvalidCheckout
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	if err := s.fulfillAPIDelivery(ctx, deliveryID); err != nil {
		return orderID, err
	}
	return orderID, nil
}

func (s *Service) fulfillAPIDelivery(ctx context.Context, deliveryID string) error {
	if s.apiExecutor == nil {
		return nil
	}
	rows, err := s.db.Query(ctx, `SELECT id, api_id FROM order_delivery_items WHERE delivery_id = $1 AND kind = 'api' AND status IN ('pending','failed') ORDER BY sort_order`, deliveryID)
	if err != nil {
		return err
	}
	type item struct{ id, apiID string }
	var items []item
	for rows.Next() {
		var current item
		if err := rows.Scan(&current.id, &current.apiID); err != nil {
			rows.Close()
			return err
		}
		items = append(items, current)
	}
	rows.Close()
	for _, current := range items {
		tag, err := s.db.Exec(ctx, `UPDATE order_delivery_items SET status = 'processing', error = NULL, updated_at = now() WHERE id = $1 AND status IN ('pending','failed')`, current.id)
		if err != nil || tag.RowsAffected() != 1 {
			continue
		}
		content, executeErr := s.apiExecutor.ExecuteAPICall(ctx, current.apiID)
		if executeErr != nil {
			_, _ = s.db.Exec(ctx, `UPDATE order_delivery_items SET status = 'failed', error = $2, updated_at = now() WHERE id = $1`, current.id, executeErr.Error())
			_, _ = s.db.Exec(ctx, `UPDATE order_deliveries SET status = 'failed', error = $2, updated_at = now() WHERE id = $1`, deliveryID, executeErr.Error())
			return fmt.Errorf("payments API delivery: %w", executeErr)
		}
		if _, err := s.db.Exec(ctx, `UPDATE order_delivery_items SET status = 'ready', content = $2, error = NULL, updated_at = now() WHERE id = $1`, current.id, content); err != nil {
			return err
		}
	}
	_, err = s.db.Exec(ctx, `UPDATE order_deliveries SET status = 'delivered', error = NULL, delivered_at = COALESCE(delivered_at, now()), updated_at = now() WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM order_delivery_items WHERE delivery_id = $1 AND status <> 'ready')`, deliveryID)
	return err
}
