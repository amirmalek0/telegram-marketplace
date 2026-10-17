package repository

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type CheckoutProduct struct {
	ID, Title, Description, DeliveryType            string
	StarsPrice                                      int64
	FileID, MessageID, InventoryID, BundleID, APIID *string
	VIPOnly, Repurchasable                          bool
}

type CheckoutRecord struct {
	Completed                                         bool
	OrderID, PaymentID, CheckoutReference, DeliveryID string
	ProductTitle, ProductDescription                  string
	Stars, WalletBalance                              int64
}

type VIPWalletCheckoutInput struct {
	TelegramID                                 int64
	PlanID                                     string
	Stars                                      int64
	PlanTitle, CheckoutReference, CheckoutData string
}

type StandalonePaymentInput struct {
	TelegramID                      int64
	Purpose                         string
	TargetID                        *string
	Stars                           int64
	CheckoutReference, CheckoutData string
	TestMode                        bool
}

type TestPayment struct {
	OrderID                            *string
	Payload, Currency, Status, Purpose string
	Amount                             int64
}

type SettlementInput struct {
	TelegramID                                         int64
	Currency                                           string
	TotalAmount                                        int64
	InvoicePayload, TelegramChargeID, ProviderChargeID string
	Raw                                                []byte
}

type SettlementResult struct{ ReferenceID, DeliveryID string }
type APIDeliveryItem struct{ ID, APIID string }

func scanCheckoutProduct(row pgx.Row) (*CheckoutProduct, error) {
	var product CheckoutProduct
	err := row.Scan(&product.ID, &product.Title, &product.Description, &product.StarsPrice,
		&product.DeliveryType, &product.FileID, &product.MessageID, &product.InventoryID,
		&product.BundleID, &product.APIID, &product.VIPOnly, &product.Repurchasable)
	return &product, err
}

func verifyPurchaseLimit(ctx context.Context, tx pgx.Tx, userID string, product *CheckoutProduct) error {
	if product.Repurchasable {
		return nil
	}
	var exists bool
	if err := tx.QueryRow(ctx, queryAlreadyPurchased, userID, product.ID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return ErrAlreadyPurchased
	}
	return nil
}

func createDeliverySnapshot(ctx context.Context, tx pgx.Tx, orderID, userID string, product *CheckoutProduct) (string, error) {
	var deliveryID string
	if err := tx.QueryRow(ctx, queryCreateDelivery, orderID, userID, product.ID, product.Title).Scan(&deliveryID); err != nil {
		return "", err
	}
	add := func(query, id string, sortOrder int) error {
		tag, err := tx.Exec(ctx, query, deliveryID, id, sortOrder)
		if err != nil || tag.RowsAffected() != 1 {
			return ErrCheckoutUnavailable
		}
		return nil
	}
	addInventory := func(id string, sortOrder int) error {
		var value string
		err := tx.QueryRow(ctx, queryReserveInventory, id, orderID, userID).Scan(&value)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrOutOfStock
		}
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, queryAddDeliveryInventory, deliveryID, value, sortOrder)
		return err
	}

	switch product.DeliveryType {
	case "file":
		rows, err := tx.Query(ctx, queryCheckoutFiles, product.ID)
		if err != nil {
			return "", err
		}
		fileIDs, err := pgx.CollectRows(rows, pgx.RowTo[string])
		if err != nil {
			return "", err
		}
		if len(fileIDs) == 0 && product.FileID != nil {
			fileIDs = []string{*product.FileID}
		}
		if len(fileIDs) == 0 {
			return "", ErrCheckoutUnavailable
		}
		for position, fileID := range fileIDs {
			if err := add(queryAddDeliveryFile, fileID, position); err != nil {
				return "", err
			}
		}
	case "message":
		if product.MessageID == nil {
			return "", ErrCheckoutUnavailable
		}
		if err := add(queryAddDeliveryMessage, *product.MessageID, 0); err != nil {
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
		if err := tx.QueryRow(ctx, queryGetBundleItems, *product.BundleID).Scan(&fileID, &messageID, &inventoryID); err != nil {
			return "", ErrCheckoutUnavailable
		}
		sortOrder := 0
		if fileID != nil {
			if err := add(queryAddDeliveryFile, *fileID, sortOrder); err != nil {
				return "", err
			}
			sortOrder++
		}
		if messageID != nil {
			if err := add(queryAddDeliveryMessage, *messageID, sortOrder); err != nil {
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
		tag, err := tx.Exec(ctx, queryAddDeliveryAPI, deliveryID, *product.APIID)
		if err != nil || tag.RowsAffected() != 1 {
			return "", ErrCheckoutUnavailable
		}
	default:
		return "", ErrCheckoutUnavailable
	}
	return deliveryID, nil
}

func debitWallet(ctx context.Context, tx pgx.Tx, userID string, amount int64, paymentID, description string) (int64, error) {
	var before int64
	if err := tx.QueryRow(ctx, queryLockWalletBalanceByUserID, userID).Scan(&before); err != nil {
		return 0, err
	}
	if before < amount {
		return before, ErrInsufficientBalance
	}
	after := before - amount
	if _, err := tx.Exec(ctx, queryUpdateWalletBalance, userID, after); err != nil {
		return before, err
	}
	_, err := tx.Exec(ctx, queryCreateWalletTransaction, userID, "purchase", amount, before, after, paymentID, description)
	return after, err
}

func creditWallet(ctx context.Context, tx pgx.Tx, userID string, amount int64, paymentID, description string) error {
	var before int64
	if err := tx.QueryRow(ctx, queryLockWalletBalanceByUserID, userID).Scan(&before); err != nil {
		return err
	}
	after := before + amount
	if _, err := tx.Exec(ctx, queryUpdateWalletBalance, userID, after); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, queryCreateWalletTransaction, userID, "topup", amount, before, after, paymentID, description)
	return err
}

func activateVIP(ctx context.Context, tx pgx.Tx, userID, planID, paymentID, method string) error {
	var title string
	var duration int
	var stars int64
	var upgrade bool
	if err := tx.QueryRow(ctx, queryGetActivationData, paymentID).Scan(&title, &duration, &stars, &upgrade); err != nil {
		return err
	}
	if duration <= 0 {
		return ErrInvalidCheckout
	}
	var startsAt, expiresAt time.Time
	if err := tx.QueryRow(ctx, queryGetActivationWindow, userID, duration, upgrade).Scan(&startsAt, &expiresAt); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, queryInsertVIPSubscription, userID, planID, title, duration, stars, paymentID, method, startsAt, expiresAt); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, queryActivateUserVIP, userID, planID, expiresAt)
	return err
}

func (r *postgresRepository) ProductAccess(ctx context.Context, telegramID int64, productID string) (bool, bool, error) {
	var vipOnly, activeVIP bool
	err := r.db.QueryRow(ctx, queryProductAccess, productID, telegramID).Scan(&vipOnly, &activeVIP)
	return vipOnly, activeVIP, err
}

func (r *postgresRepository) ReleaseExpiredReservations(ctx context.Context) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, queryLockCheckoutLifecycle); err != nil {
		return err
	}
	for _, query := range []string{queryExpireOrders, queryExpireDeliveries, queryExpireInventory, queryExpirePayments} {
		if _, err = tx.Exec(ctx, query); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *postgresRepository) CreateProductStarsCheckout(ctx context.Context, telegramID int64, productID, reference string, testMode bool, couponCode string) (*CheckoutRecord, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var userID string
	var banned, activeVIP bool
	var balance int64
	if err := tx.QueryRow(ctx, queryLockCheckoutUser, telegramID).Scan(&userID, &banned, &balance, &activeVIP); err != nil {
		return nil, ErrInvalidCheckout
	}
	if banned {
		return nil, ErrCheckoutUnavailable
	}
	product, err := scanCheckoutProduct(tx.QueryRow(ctx, queryGetCheckoutProduct, productID))
	if err != nil || product.StarsPrice <= 0 {
		return nil, ErrCheckoutUnavailable
	}
	if err := verifyPurchaseLimit(ctx, tx, userID, product); err != nil {
		return nil, err
	}
	price, err := priceProduct(ctx, tx, product, couponCode, userID)
	if err != nil {
		return nil, err
	}
	method := "telegram_stars"
	if price.Payable == 0 {
		method = "coupon"
	}
	var orderID string
	if err := tx.QueryRow(ctx, queryCreatePendingOrder, userID, product.ID, price.Original, method, price.Discount, price.CouponID, price.Code).Scan(&orderID); err != nil {
		return nil, err
	}
	var paymentID string
	if price.Payable > 0 {
		if err := tx.QueryRow(ctx, queryCreateProductStarsPayment, orderID, userID, product.ID, price.Payable, reference, testMode).Scan(&paymentID); err != nil {
			return nil, err
		}
	}
	deliveryID, err := createDeliverySnapshot(ctx, tx, orderID, userID, product)
	if err != nil {
		return nil, err
	}
	if price.Payable == 0 {
		for _, step := range []struct{ query, id string }{{queryPayOrder, orderID}, {queryMarkInventorySold, orderID}, {queryMarkDeliveryReady, deliveryID}, {queryConsumeOrderCoupon, orderID}} {
			if _, err := tx.Exec(ctx, step.query, step.id); err != nil {
				return nil, err
			}
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &CheckoutRecord{OrderID: orderID, PaymentID: paymentID, CheckoutReference: reference, DeliveryID: deliveryID, ProductTitle: product.Title, ProductDescription: product.Description, Stars: price.Payable, Completed: price.Payable == 0, WalletBalance: balance}, nil
}

func (r *postgresRepository) CreateImmediateProductCheckout(ctx context.Context, telegramID int64, productID, reference string, vipAccess bool, couponCode string) (*CheckoutRecord, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var userID string
	var banned, activeVIP bool
	var balance int64
	if err := tx.QueryRow(ctx, queryLockCheckoutUser, telegramID).Scan(&userID, &banned, &balance, &activeVIP); err != nil || banned {
		return nil, ErrCheckoutUnavailable
	}
	product, err := scanCheckoutProduct(tx.QueryRow(ctx, queryGetCheckoutProduct, productID))
	if err != nil || (!vipAccess && product.StarsPrice <= 0) || (vipAccess && (!product.VIPOnly || !activeVIP)) {
		return nil, ErrCheckoutUnavailable
	}
	if err := verifyPurchaseLimit(ctx, tx, userID, product); err != nil {
		return nil, err
	}
	price := productPrice{}
	if !vipAccess {
		price, err = priceProduct(ctx, tx, product, couponCode, userID)
		if err != nil {
			return nil, err
		}
	}
	charge, method := price.Payable, "wallet"
	if vipAccess {
		charge, method = 0, "vip_access"
	} else if balance < charge {
		return nil, ErrInsufficientBalance
	}
	var orderID string
	if !vipAccess && charge == 0 {
		method = "coupon"
	}
	if err := tx.QueryRow(ctx, queryCreatePaidOrder, userID, product.ID, price.Original, method, price.Discount, price.CouponID, price.Code).Scan(&orderID); err != nil {
		return nil, err
	}
	deliveryID, err := createDeliverySnapshot(ctx, tx, orderID, userID, product)
	if err != nil {
		return nil, err
	}
	paymentID := ""
	if !vipAccess && charge > 0 {
		if err := tx.QueryRow(ctx, queryCreateProductWalletPayment, orderID, userID, product.ID, charge, reference).Scan(&paymentID); err != nil {
			return nil, err
		}
		balance, err = debitWallet(ctx, tx, userID, charge, paymentID, "خرید "+product.Title)
		if err != nil {
			return nil, err
		}
	}
	if _, err := tx.Exec(ctx, queryMarkInventorySold, orderID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, queryMarkDeliveryReady, deliveryID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, queryConsumeOrderCoupon, orderID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &CheckoutRecord{OrderID: orderID, PaymentID: paymentID, DeliveryID: deliveryID, Stars: charge, WalletBalance: balance}, nil
}

func (r *postgresRepository) CreateVIPWalletCheckout(ctx context.Context, input VIPWalletCheckoutInput) (*CheckoutRecord, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var userID string
	var banned, activeVIP bool
	var balance int64
	if err := tx.QueryRow(ctx, queryLockCheckoutUser, input.TelegramID).Scan(&userID, &banned, &balance, &activeVIP); err != nil || banned {
		return nil, ErrCheckoutUnavailable
	}
	if balance < input.Stars {
		return nil, ErrInsufficientBalance
	}
	var paymentID string
	if err := tx.QueryRow(ctx, queryCreateVIPWalletPayment, userID, input.PlanID, input.Stars, input.CheckoutReference, input.CheckoutData).Scan(&paymentID); err != nil {
		return nil, err
	}
	balance, err = debitWallet(ctx, tx, userID, input.Stars, paymentID, "خرید "+input.PlanTitle)
	if err != nil {
		return nil, err
	}
	if err := activateVIP(ctx, tx, userID, input.PlanID, paymentID, "wallet"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &CheckoutRecord{PaymentID: paymentID, Stars: input.Stars, WalletBalance: balance}, nil
}

func (r *postgresRepository) CreateStandalonePayment(ctx context.Context, input StandalonePaymentInput) (*CheckoutRecord, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var userID string
	var banned, activeVIP bool
	var balance int64
	if err := tx.QueryRow(ctx, queryLockCheckoutUser, input.TelegramID).Scan(&userID, &banned, &balance, &activeVIP); err != nil || banned {
		return nil, ErrCheckoutUnavailable
	}
	var paymentID string
	if err := tx.QueryRow(ctx, queryCreateStandalonePayment, userID, input.Purpose, input.TargetID, input.Stars, input.CheckoutReference, input.CheckoutData, input.TestMode).Scan(&paymentID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &CheckoutRecord{PaymentID: paymentID, CheckoutReference: input.CheckoutReference, Stars: input.Stars}, nil
}

func jsonError(reason string) string {
	data, _ := json.Marshal(map[string]string{"error": reason})
	return string(data)
}

func (r *postgresRepository) GetTestPayment(ctx context.Context, telegramID int64, paymentID string) (*TestPayment, error) {
	var item TestPayment
	err := r.db.QueryRow(ctx, queryGetTestPayment, paymentID, telegramID).Scan(&item.OrderID, &item.Payload, &item.Currency, &item.Amount, &item.Status, &item.Purpose)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *postgresRepository) FailStandalonePayment(ctx context.Context, paymentID, reason string) error {
	_, err := r.db.Exec(ctx, queryFailPayment, paymentID, jsonError(reason))
	return err
}

func (r *postgresRepository) FailCheckout(ctx context.Context, orderID, paymentID, reason string, cancelled bool) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, queryFailPayment, paymentID, jsonError(reason))
	if err != nil {
		return err
	}
	// Do not corrupt a settled delivery when a cancellation races settlement.
	if tag.RowsAffected() != 1 {
		return ErrInvalidCheckout
	}
	steps := []struct {
		query string
		args  []any
	}{
		{queryFailOrder, []any{orderID}},
		{queryFailDeliveryByOrder, []any{orderID, reason}},
		{queryReleaseInventoryByOrder, []any{orderID}},
	}
	for _, step := range steps {
		if _, err = tx.Exec(ctx, step.query, step.args...); err != nil {
			return err
		}
	}
	if cancelled {
		if _, err = tx.Exec(ctx, queryCancelFailedOrder, orderID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *postgresRepository) DeliveryOutcome(ctx context.Context, orderID string) (string, string) {
	var status string
	var message *string
	if err := r.db.QueryRow(ctx, queryDeliveryOutcome, orderID).Scan(&status, &message); err != nil {
		return "", ""
	}
	if message == nil {
		return status, ""
	}
	return status, "تحویل موقتاً ناموفق بود؛ دوباره تلاش می‌شود."
}

func (r *postgresRepository) ValidatePreCheckout(ctx context.Context, telegramID int64, payload, currency string, amount int64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, queryLockCheckoutLifecycle); err != nil {
		return err
	}
	var storedCurrency, status, purpose string
	var orderStatus *string
	var storedAmount, owner int64
	err = tx.QueryRow(ctx, queryValidatePreCheckout, payload).Scan(&storedCurrency, &storedAmount, &status, &orderStatus, &owner, &purpose)
	invalidProduct := purpose == "product" && (orderStatus == nil || *orderStatus != "pending")
	if err != nil || status != "pending" || invalidProduct || owner != telegramID || storedCurrency != currency || storedAmount != amount {
		return ErrInvalidCheckout
	}
	if _, err = tx.Exec(ctx, queryAcceptPreCheckout, payload); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *postgresRepository) SettleStarsPayment(ctx context.Context, input SettlementInput) (*SettlementResult, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, queryLockCheckoutLifecycle); err != nil {
		return nil, err
	}
	var paymentID, userID, purpose, currency, status string
	var refundIntended bool
	if !strings.HasPrefix(input.TelegramChargeID, "test:") {
		if err := tx.QueryRow(ctx, queryRefundIntended, input.TelegramChargeID).Scan(&refundIntended); err != nil {
			return nil, err
		}
		if refundIntended {
			return nil, ErrInvalidCheckout
		}
	}
	var orderID, targetID, existingCharge *string
	var orderStatus *string
	var test bool
	var amount, owner int64
	err = tx.QueryRow(ctx, queryLockPaymentForSettlement, input.InvoicePayload).Scan(&paymentID, &orderID, &userID, &purpose, &targetID, &currency, &amount, &test, &status, &orderStatus, &owner, &existingCharge)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err != nil || owner != input.TelegramID || currency != input.Currency || amount != input.TotalAmount || input.TelegramChargeID == "" {
		return nil, ErrInvalidCheckout
	}
	if test != strings.HasPrefix(input.TelegramChargeID, "test:") {
		return nil, ErrInvalidCheckout
	}
	deliveryID := ""
	if test {
		var enabled bool
		if err := tx.QueryRow(ctx, querySimulationEnabled).Scan(&enabled); err != nil {
			return nil, err
		}
		if !enabled {
			return nil, ErrInvalidCheckout
		}
	}
	if status == "pending" {
		if _, err := tx.Exec(ctx, querySucceedPayment, paymentID, input.TelegramChargeID, input.ProviderChargeID, input.Raw); err != nil {
			return nil, err
		}
		switch purpose {
		case "product":
			if orderID == nil || orderStatus == nil || *orderStatus != "pending" {
				return nil, ErrInvalidCheckout
			}
			if err := tx.QueryRow(ctx, queryLockDeliveryByOrder, *orderID).Scan(&deliveryID); err != nil {
				if !errors.Is(err, pgx.ErrNoRows) {
					return nil, err
				}
				return nil, ErrInvalidCheckout
			}
			if _, err := tx.Exec(ctx, queryPayOrder, *orderID); err != nil {
				return nil, err
			}
			if _, err := tx.Exec(ctx, queryConsumeOrderCoupon, *orderID); err != nil {
				return nil, err
			}
			if _, err := tx.Exec(ctx, queryMarkInventorySold, *orderID); err != nil {
				return nil, err
			}
			if _, err := tx.Exec(ctx, queryMarkDeliveryReady, deliveryID); err != nil {
				return nil, err
			}
		case "vip_plan":
			if targetID == nil {
				return nil, ErrInvalidCheckout
			}
			if err := activateVIP(ctx, tx, userID, *targetID, paymentID, "telegram_stars"); err != nil {
				return nil, err
			}
		case "wallet_topup":
			if err := creditWallet(ctx, tx, userID, amount, paymentID, "شارژ کیف پول با تلگرام استار"); err != nil {
				return nil, err
			}
		default:
			return nil, ErrInvalidCheckout
		}
	} else if status != "succeeded" || existingCharge == nil || *existingCharge != input.TelegramChargeID {
		return nil, ErrInvalidCheckout
	}
	// Replayed successful payments must resume unfinished delivery too.
	if purpose == "product" && orderID != nil && deliveryID == "" {
		if err := tx.QueryRow(ctx, queryLockDeliveryByOrder, *orderID).Scan(&deliveryID); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	reference := paymentID
	if orderID != nil {
		reference = *orderID
	}
	return &SettlementResult{ReferenceID: reference, DeliveryID: deliveryID}, nil
}

func (r *postgresRepository) ListPendingAPIDeliveryItems(ctx context.Context, deliveryID string) ([]APIDeliveryItem, error) {
	rows, err := r.db.Query(ctx, queryListPendingAPIDeliveryItems, deliveryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []APIDeliveryItem{}
	for rows.Next() {
		var item APIDeliveryItem
		if err := rows.Scan(&item.ID, &item.APIID); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *postgresRepository) ClaimAPIDeliveryItem(ctx context.Context, itemID string) (bool, error) {
	tag, err := r.db.Exec(ctx, queryClaimAPIDeliveryItem, itemID)
	return err == nil && tag.RowsAffected() == 1, err
}

func (r *postgresRepository) FailAPIDeliveryItem(ctx context.Context, deliveryID, itemID, reason string) error {
	if _, err := r.db.Exec(ctx, queryFailAPIDeliveryItem, itemID, reason); err != nil {
		return err
	}
	_, err := r.db.Exec(ctx, queryFailAPIDelivery, deliveryID, reason)
	return err
}

func (r *postgresRepository) CompleteAPIDeliveryItem(ctx context.Context, itemID, content string) error {
	_, err := r.db.Exec(ctx, queryCompleteAPIDeliveryItem, itemID, content)
	return err
}

func (r *postgresRepository) CompleteAPIDelivery(ctx context.Context, deliveryID string) error {
	_, err := r.db.Exec(ctx, queryCompleteAPIDelivery, deliveryID)
	return err
}
