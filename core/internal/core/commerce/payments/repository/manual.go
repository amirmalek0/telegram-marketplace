package repository

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	couponmodel "telegram-marketplace/internal/core/commerce/coupons/model"
	"telegram-marketplace/internal/core/commerce/payments/manual"
)

// ManualRepository keeps the new provider's persistence contract explicit.
// Existing Stars-only test doubles need not implement these operations.
type ManualRepository interface {
	ManualConfig(context.Context) (*manual.Config, error)
	SaveManualConfig(context.Context, manual.Config, string) (*manual.Config, error)
	ManualPrices(context.Context, int, int) ([]manual.Price, error)
	ManualPrice(context.Context, string, string) (*manual.Price, error)
	SetManualPrice(context.Context, string, string, int64) error
	CreateManualCheckout(context.Context, int64, string, string, string, ...string) (*manual.Checkout, error)
	GetManualCheckout(context.Context, string, int64) (*manual.Checkout, error)
	ListManualCheckouts(context.Context, int64, string, int, int) ([]manual.Checkout, error)
	SubmitManualProof(context.Context, int64, string, string, string, string, string) error
	ReviewManualPayment(context.Context, string, string, bool, string) (*ManualSettlement, error)
	CancelManualPayment(context.Context, int64, string) error
	ExpireManualPayments(context.Context) error
}

var _ ManualRepository = (*postgresRepository)(nil)

func readManualConfig(row pgx.Row) (*manual.Config, error) {
	var data []byte
	var revision int64
	if err := row.Scan(&data, &revision); err != nil {
		return nil, err
	}
	c := manual.DefaultConfig()
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, err
	}
	c.Revision = revision
	return &c, nil
}

func (r *postgresRepository) ManualConfig(ctx context.Context) (*manual.Config, error) {
	return readManualConfig(r.db.QueryRow(ctx, queryManualConfig))
}

func (r *postgresRepository) SaveManualConfig(ctx context.Context, c manual.Config, adminID string) (*manual.Config, error) {
	data, err := json.Marshal(c)
	if err != nil {
		return nil, err
	}
	err = r.db.QueryRow(ctx, queryUpdateManualConfig, data, adminID, c.Revision).Scan(&c.Revision)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, manual.ErrConflict
	}
	if err != nil {
		return nil, err
	}
	return r.ManualConfig(ctx)
}

func (r *postgresRepository) ManualPrices(ctx context.Context, limit, offset int) ([]manual.Price, error) {
	rows, err := r.db.Query(ctx, queryListManualPrices, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []manual.Price{}
	for rows.Next() {
		var p manual.Price
		if err := rows.Scan(&p.Purpose, &p.TargetID, &p.Title, &p.Toman, &p.Stars, &p.Status); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

func (r *postgresRepository) ManualPrice(ctx context.Context, purpose, id string) (*manual.Price, error) {
	policyProduct := ""
	if purpose == "product" {
		policyProduct = id
	}
	methods, err := r.PaymentMethods(ctx, policyProduct)
	if err != nil {
		return nil, err
	}
	if !methods.CardToCard {
		return nil, manual.ErrUnavailable
	}
	config, err := r.ManualConfig(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := chooseManualCards(config); err != nil {
		return nil, err
	}
	var p manual.Price
	err = r.db.QueryRow(ctx, queryManualPrice, purpose, id).Scan(&p.Purpose, &p.TargetID, &p.Title, &p.Toman, &p.Stars, &p.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, manual.ErrUnavailable
	}
	return &p, err
}

func (r *postgresRepository) SetManualPrice(ctx context.Context, purpose, id string, toman int64) error {
	query := map[string]string{"product": queryUpdateProductToman, "vip_plan": queryUpdateVIPToman, "wallet_topup": queryUpdatePackToman}[purpose]
	if query == "" || toman < 0 || toman > manual.MaxToman {
		return manual.ErrInvalid
	}
	tag, err := r.db.Exec(ctx, query, id, toman)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanManualCheckout(row pgx.Row) (*manual.Checkout, error) {
	var c manual.Checkout
	var cards, data []byte
	err := row.Scan(&c.ID, &c.OrderID, &c.UserID, &c.UserName, &c.Username, &c.Purpose, &c.TargetID, &c.Title, &c.Toman, &c.Status, &c.IsTest, &cards, &c.Instructions, &c.TransactionID, &c.DestinationCardID, &c.ReceiptKey, &c.ReviewNote, &c.ReviewedBy, &c.ReviewedAt, &c.CreatedAt, &c.SubmittedAt, &data)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err = json.Unmarshal(cards, &c.Cards); err != nil {
		return nil, err
	}
	c.HasReceipt = c.ReceiptKey != ""
	var snapshot manualCheckoutData
	if err = json.Unmarshal(data, &snapshot); err != nil {
		return nil, err
	}
	c.DiscountToman, c.CouponCode = snapshot.DiscountToman, snapshot.CouponCode
	c.OriginalToman, c.CreditToman, c.RemainingDays, c.WalletStars = snapshot.OriginalToman, snapshot.CreditToman, snapshot.RemainingDays, snapshot.WalletStars
	if c.OriginalToman == 0 {
		c.OriginalToman = c.Toman
	}
	c.ExpiresAt = c.CreatedAt.Add(24 * time.Hour)
	return &c, nil
}

func (r *postgresRepository) GetManualCheckout(ctx context.Context, id string, telegramID int64) (*manual.Checkout, error) {
	return scanManualCheckout(r.db.QueryRow(ctx, queryGetManualCheckout, id, telegramID))
}

func (r *postgresRepository) ListManualCheckouts(ctx context.Context, tg int64, status string, limit, offset int) ([]manual.Checkout, error) {
	rows, err := r.db.Query(ctx, queryListManualCheckout, tg, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []manual.Checkout{}
	for rows.Next() {
		c, err := scanManualCheckout(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *c)
	}
	return result, rows.Err()
}

func chooseManualCards(c *manual.Config) ([]manual.Card, error) {
	cards := []manual.Card{}
	for _, card := range c.Cards {
		if card.Active && (c.Mode != "fixed" || card.ID == c.FixedCardID) {
			cards = append(cards, card)
		}
	}
	if len(cards) == 0 {
		return nil, manual.ErrUnavailable
	}
	if c.Mode == "random" {
		index, err := rand.Int(rand.Reader, big.NewInt(int64(len(cards))))
		if err != nil {
			return nil, err
		}
		cards = []manual.Card{cards[index.Int64()]}
	}
	return cards, nil
}

type manualCheckoutData struct {
	DiscountToman  int64      `json:"discount_toman"`
	CouponCode     string     `json:"coupon_code"`
	OriginalToman  int64      `json:"original_toman"`
	CreditToman    int64      `json:"credit_toman"`
	RemainingDays  int        `json:"remaining_days"`
	PlanTitle      string     `json:"plan_title"`
	Duration       int        `json:"duration_days"`
	Stars          int64      `json:"stars_price"`
	WalletStars    int64      `json:"wallet_stars"`
	Upgrade        bool       `json:"is_upgrade"`
	PreviousPlan   string     `json:"previous_plan"`
	PreviousExpiry *time.Time `json:"previous_expiry"`
}

func (r *postgresRepository) CreateManualCheckout(ctx context.Context, tg int64, purpose, targetID, requestID string, codes ...string) (*manual.Checkout, error) {
	code := ""
	if len(codes) > 0 {
		code = couponmodel.NormalizeCode(codes[0])
	}
	if len(code) > 256 || (code != "" && purpose != "product") {
		return nil, manual.ErrInvalid
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, queryLockCheckoutLifecycle); err != nil {
		return nil, err
	}
	var userID string
	var banned, activeVIP bool
	var balance int64
	if err = tx.QueryRow(ctx, queryLockCheckoutUser, tg).Scan(&userID, &banned, &balance, &activeVIP); err != nil || banned {
		return nil, manual.ErrUnavailable
	}
	// A client retry must return the original price and selected cards, not create another reservation.
	var existingID, existingPurpose, existingTarget, existingCode string
	err = tx.QueryRow(ctx, queryManualRequest, userID, requestID).Scan(&existingID, &existingPurpose, &existingTarget, &existingCode)
	if err == nil {
		if existingPurpose != purpose || existingTarget != targetID || existingCode != code {
			return nil, manual.ErrConflict
		}
		existing, e := scanManualCheckout(tx.QueryRow(ctx, queryGetManualCheckout, existingID, tg))
		if e == nil && existing.Status == "approved" && !existing.IsTest && existing.Toman == 0 && existing.OrderID != nil {
			e = tx.QueryRow(ctx, queryLockDeliveryByOrder, *existing.OrderID).Scan(&existing.DeliveryID)
		}
		return existing, e
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	config, err := readManualConfig(tx.QueryRow(ctx, queryManualConfigLock))
	if err != nil {
		return nil, err
	}
	policyProduct := ""
	if purpose == "product" {
		policyProduct = targetID
	}
	if err := requirePaymentMethod(ctx, tx, policyProduct, "card_to_card"); err != nil {
		return nil, err
	}
	cards, err := chooseManualCards(config)
	if err != nil {
		return nil, err
	}
	var count int
	if err = tx.QueryRow(ctx, queryManualPendingCount, userID).Scan(&count); err != nil {
		return nil, err
	}
	if count >= 3 {
		return nil, manual.ErrConflict
	}
	var test bool
	if err = tx.QueryRow(ctx, querySimulationEnabled).Scan(&test); err != nil {
		return nil, err
	}
	var title string
	var toman int64
	var orderID *string
	var deliveryID string
	data := manualCheckoutData{}
	switch purpose {
	case "product":
		product, e := scanCheckoutProduct(tx.QueryRow(ctx, queryGetCheckoutProduct, targetID))
		if e != nil {
			return nil, manual.ErrUnavailable
		}
		if product.VIPOnly && activeVIP {
			return nil, manual.ErrUnavailable
		}
		if err = verifyPurchaseLimit(ctx, tx, userID, product); err != nil {
			return nil, err
		}
		if err = tx.QueryRow(ctx, queryProductToman, targetID).Scan(&toman); err != nil {
			return nil, err
		}
		title = product.Title
		if toman <= 0 || toman > manual.MaxToman {
			return nil, manual.ErrUnavailable
		}
		price, e := priceProductCurrency(ctx, tx, product, code, userID, "toman", toman)
		if e != nil {
			return nil, e
		}
		data.OriginalToman, data.DiscountToman, data.CouponCode = price.Original, price.Discount, price.Code
		toman = price.Payable
		var id string
		if err = tx.QueryRow(ctx, queryCreatePendingOrder, userID, targetID, price.Original*10, manual.Method, price.Discount*10, price.CouponID, price.Code).Scan(&id); err != nil {
			return nil, err
		}
		orderID = &id
		if _, err = tx.Exec(ctx, queryManualOrderCurrency, id); err != nil {
			return nil, err
		}
		if !test {
			if deliveryID, err = createDeliverySnapshot(ctx, tx, id, userID, product); err != nil {
				return nil, err
			}
		}
	case "vip_plan":
		var tier int
		if err = tx.QueryRow(ctx, queryVIPToman, targetID).Scan(&title, &toman, &data.Stars, &data.Duration, &tier); err != nil {
			return nil, manual.ErrUnavailable
		}
		data.PlanTitle = title
		data.OriginalToman = toman
		if err = tx.QueryRow(ctx, queryManualVIPState, userID).Scan(&data.PreviousPlan, &data.PreviousExpiry); err != nil {
			return nil, err
		}
		if activeVIP && data.PreviousPlan != targetID {
			var oldTier int
			if err = tx.QueryRow(ctx, queryManualActiveVIPTier, data.PreviousPlan).Scan(&oldTier); err != nil {
				return nil, err
			}
			if tier <= oldTier {
				return nil, manual.ErrUnavailable
			}
			data.Upgrade = true
			var oldToman int64
			var oldDuration int
			if err = tx.QueryRow(ctx, queryManualVIPCredit, data.PreviousPlan).Scan(&oldToman, &oldDuration); err != nil {
				return nil, err
			}
			if data.PreviousExpiry != nil && oldDuration > 0 && oldToman > 0 && toman > 0 {
				seconds := int64(time.Until(*data.PreviousExpiry).Seconds())
				if seconds > 0 {
					// Bound before multiplying; prolonged renewals must not overflow or make the new price negative.
					if seconds > int64(oldDuration)*86400 {
						seconds = int64(oldDuration) * 86400
					}
					data.RemainingDays = int((seconds + 86399) / 86400)
					data.CreditToman = seconds * oldToman / (int64(oldDuration) * 86400)
					if data.CreditToman >= toman {
						data.CreditToman = toman - 1
					}
					toman -= data.CreditToman
				}
			}
		}
	case "wallet_topup":
		if err = tx.QueryRow(ctx, queryPackToman, targetID).Scan(&title, &toman, &data.WalletStars); err != nil {
			return nil, manual.ErrUnavailable
		}
	default:
		return nil, manual.ErrInvalid
	}
	if toman < 0 || toman > manual.MaxToman || (toman == 0 && data.CouponCode == "") {
		return nil, manual.ErrUnavailable
	}
	if data.OriginalToman == 0 {
		data.OriginalToman = toman
	}
	payload, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	cardJSON, err := json.Marshal(cards)
	if err != nil {
		return nil, err
	}
	var paymentID string
	if err = tx.QueryRow(ctx, queryCreateManualPayment, orderID, userID, purpose, targetID, toman*10, uuid.NewString(), test, payload).Scan(&paymentID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(ctx, queryCreateManualReview, paymentID, requestID, userID, title, cardJSON, config.Instructions); err != nil {
		return nil, err
	}
	if toman == 0 {
		if orderID == nil {
			return nil, manual.ErrInvalid
		}
		if test {
			if err = failManualOrder(ctx, tx, *orderID, "آزمایشی"); err != nil {
				return nil, err
			}
		} else {
			for _, step := range []struct{ q, id string }{{queryPayOrder, *orderID}, {queryMarkInventorySold, *orderID}, {queryMarkDeliveryReady, deliveryID}, {queryConsumeOrderCoupon, *orderID}} {
				if _, err = tx.Exec(ctx, step.q, step.id); err != nil {
					return nil, err
				}
			}
		}
		for _, q := range []string{queryApproveManualPayment, queryApproveFreeManual} {
			if _, err = tx.Exec(ctx, q, paymentID); err != nil {
				return nil, err
			}
		}
	}
	result, err := scanManualCheckout(tx.QueryRow(ctx, queryGetManualCheckout, paymentID, tg))
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	if toman == 0 && !test {
		result.DeliveryID = deliveryID
	}
	return result, nil
}

type lockedManual struct {
	UserID            string
	OrderID           *string
	Purpose, TargetID string
	Test              bool
	Data              manualCheckoutData
	Status            string
	TelegramID        int64
	Banned            bool
}

func lockManual(ctx context.Context, tx pgx.Tx, id string, tg int64) (*lockedManual, error) {
	if _, err := tx.Exec(ctx, queryLockCheckoutLifecycle); err != nil {
		return nil, err
	}
	var p lockedManual
	var data []byte
	err := tx.QueryRow(ctx, queryLockManualPayment, id, tg).Scan(&p.UserID, &p.OrderID, &p.Purpose, &p.TargetID, &p.Test, &data, &p.Status, &p.TelegramID, &p.Banned)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(data, &p.Data)
	return &p, err
}

func (r *postgresRepository) SubmitManualProof(ctx context.Context, tg int64, id, transaction, cardID, receiptKey, receiptHash string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	p, err := lockManual(ctx, tx, id, tg)
	if err != nil {
		return err
	}
	if p.Banned || p.Status != "awaiting_proof" {
		return manual.ErrConflict
	}
	c, err := scanManualCheckout(tx.QueryRow(ctx, queryGetManualCheckout, id, tg))
	if err != nil {
		return err
	}
	if time.Now().After(c.ExpiresAt) {
		return manual.ErrConflict
	}
	valid := false
	for _, card := range c.Cards {
		if card.ID == cardID {
			valid = true
		}
	}
	if !valid || transaction == "" && receiptKey == "" {
		return manual.ErrInvalid
	}
	_, err = tx.Exec(ctx, querySubmitManualProof, id, transaction, cardID, receiptKey, receiptHash)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return manual.ErrConflict
	}
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type ManualSettlement struct {
	TelegramID int64
	DeliveryID string
	Test       bool
}

func (r *postgresRepository) ReviewManualPayment(ctx context.Context, id, adminID string, approve bool, note string) (*ManualSettlement, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	p, err := lockManual(ctx, tx, id, 0)
	if err != nil {
		return nil, err
	}
	result := &ManualSettlement{TelegramID: p.TelegramID, Test: p.Test}
	desired := "rejected"
	if approve {
		desired = "approved"
	}
	if p.Status == desired {
		return result, nil
	}
	if p.Status != "submitted" {
		return nil, manual.ErrConflict
	}
	if approve && p.Banned {
		return nil, manual.ErrUnavailable
	}
	if approve && p.Test {
		var enabled bool
		if err = tx.QueryRow(ctx, querySimulationEnabled).Scan(&enabled); err != nil {
			return nil, err
		}
		if !enabled {
			return nil, manual.ErrConflict
		}
	}
	if approve && !p.Test {
		switch p.Purpose {
		case "product":
			if p.OrderID == nil {
				return nil, manual.ErrConflict
			}
			if err = tx.QueryRow(ctx, queryLockDeliveryByOrder, *p.OrderID).Scan(&result.DeliveryID); err != nil {
				return nil, err
			}
			for _, step := range []struct{ q, id string }{{queryPayOrder, *p.OrderID}, {queryMarkInventorySold, *p.OrderID}, {queryMarkDeliveryReady, result.DeliveryID}, {queryConsumeOrderCoupon, *p.OrderID}} {
				if _, err = tx.Exec(ctx, step.q, step.id); err != nil {
					return nil, err
				}
			}
		case "wallet_topup":
			if p.Data.WalletStars <= 0 {
				return nil, manual.ErrInvalid
			}
			if err = creditWallet(ctx, tx, p.UserID, p.Data.WalletStars, id, "شارژ کیف پول با کارت‌به‌کارت"); err != nil {
				return nil, err
			}
		case "vip_plan":
			var current string
			var expires *time.Time
			if err = tx.QueryRow(ctx, queryManualVIPState, p.UserID).Scan(&current, &expires); err != nil {
				return nil, err
			}
			// Do not overwrite a membership bought or changed while this transfer was reviewed.
			if current != p.Data.PreviousPlan || !sameTime(expires, p.Data.PreviousExpiry) {
				return nil, manual.ErrConflict
			}
			if err = activateVIP(ctx, tx, p.UserID, p.TargetID, id, manual.Method); err != nil {
				return nil, err
			}
		default:
			return nil, manual.ErrInvalid
		}
	} else if p.OrderID != nil {
		if err = failManualOrder(ctx, tx, *p.OrderID, note); err != nil {
			return nil, err
		}
	}
	if approve {
		_, err = tx.Exec(ctx, queryApproveManualPayment, id)
	} else {
		_, err = tx.Exec(ctx, queryFailPayment, id, jsonError(note))
	}
	if err != nil {
		return nil, err
	}
	if _, err = tx.Exec(ctx, queryReviewManual, id, desired, note, adminID); err != nil {
		return nil, err
	}
	checkout, err := scanManualCheckout(tx.QueryRow(ctx, queryGetManualCheckout, id, 0))
	if err != nil {
		return nil, err
	}
	config, err := readManualConfig(tx.QueryRow(ctx, queryManualConfig))
	if err != nil {
		return nil, err
	}
	notice := manual.BuildReviewNotice(checkout, approve, note, *config)
	templateKey := "manual.rejected"
	if approve {
		templateKey = "manual.approved"
	}
	vars, _ := json.Marshal(notice.Vars)
	if _, err = tx.Exec(ctx, queryQueuePaymentNotice, notice.Title, notice.Message, p.UserID, "manual-review:"+id, notice.ActionPath, p.TelegramID, templateKey, vars); err != nil {
		return nil, err
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	return result, nil
}

func sameTime(a, b *time.Time) bool {
	return a == nil && b == nil || a != nil && b != nil && a.Equal(*b)
}

func failManualOrder(ctx context.Context, tx pgx.Tx, id, note string) error {
	for _, q := range []string{queryFailOrder, queryReleaseInventoryByOrder} {
		if _, err := tx.Exec(ctx, q, id); err != nil {
			return err
		}
	}
	_, err := tx.Exec(ctx, queryFailDeliveryByOrder, id, note)
	return err
}

// Submitted receipts never expire automatically: money may already be in the
// merchant's bank account. Only abandoned, unsubmitted checkouts release stock.
func (r *postgresRepository) ExpireManualPayments(ctx context.Context) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, queryLockCheckoutLifecycle); err != nil {
		return err
	}
	rows, err := tx.Query(ctx, queryExpiredManual)
	if err != nil {
		return err
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return err
	}
	for _, id := range ids {
		p, err := lockManual(ctx, tx, id, 0)
		if err != nil {
			return err
		}
		if p.Status != "awaiting_proof" {
			continue
		}
		if p.OrderID != nil {
			if err = failManualOrder(ctx, tx, *p.OrderID, "مهلت پرداخت تمام شد"); err != nil {
				return err
			}
		}
		if _, err = tx.Exec(ctx, queryFailPayment, id, jsonError("checkout expired")); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, queryExpireManual, id); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *postgresRepository) CancelManualPayment(ctx context.Context, tg int64, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	p, err := lockManual(ctx, tx, id, tg)
	if err != nil {
		return err
	}
	if p.Status == "cancelled" {
		return nil
	}
	if p.Status != "awaiting_proof" {
		return manual.ErrConflict
	}
	if p.OrderID != nil {
		if err = failManualOrder(ctx, tx, *p.OrderID, "لغو توسط کاربر"); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, queryFailPayment, id, jsonError("cancelled")); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, queryCancelManual, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
