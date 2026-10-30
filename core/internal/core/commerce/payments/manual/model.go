// Package manual contains provider-independent rules for reviewed bank transfers.
package manual

import (
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

const Method = "card_to_card"

// The UI quotes whole Toman; persistence uses ISO IRR, one Toman = ten Rial.
const Currency = "IRR"
const MaxToman int64 = 1_000_000_000

var ErrInvalid = errors.New("اطلاعات پرداخت کارت‌به‌کارت معتبر نیست")
var ErrUnavailable = errors.New("پرداخت کارت‌به‌کارت برای این خرید در دسترس نیست")
var ErrConflict = errors.New("وضعیت پرداخت تغییر کرده است؛ صفحه را تازه کنید")

type Bank struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

type Card struct {
	ID     string `json:"id"`
	Number string `json:"number"`
	Owner  string `json:"owner"`
	Bank   Bank   `json:"bank"`
	Active bool   `json:"active"`
}

type Config struct {
	Enabled          bool   `json:"enabled"`
	Mode             string `json:"mode"` // random, fixed, multiple
	FixedCardID      string `json:"fixed_card_id"`
	Instructions     string `json:"instructions"`
	ApprovalMessage  string `json:"approval_message"`
	RejectionMessage string `json:"rejection_message"`
	Cards            []Card `json:"cards"`
	Revision         int64  `json:"revision"`
}

func DefaultConfig() Config {
	return Config{Mode: "random", Cards: []Card{}, ApprovalMessage: DefaultApprovalMessage, RejectionMessage: DefaultRejectionMessage, Instructions: "مبلغ را به کارت نمایش‌داده‌شده واریز کنید، سپس شماره پیگیری یا تصویر رسید را ارسال کنید. خرید پس از تأیید مدیر فعال می‌شود."}
}

func ValidateConfig(c Config) (Config, error) {
	if c.Cards == nil {
		c.Cards = []Card{}
	}
	if c.Mode != "random" && c.Mode != "fixed" && c.Mode != "multiple" {
		return c, ErrInvalid
	}
	c.Instructions = strings.TrimSpace(c.Instructions)
	var err error
	if c.ApprovalMessage, err = validateNoticeTemplate(c.ApprovalMessage, DefaultApprovalMessage); err != nil {
		return c, err
	}
	if c.RejectionMessage, err = validateNoticeTemplate(c.RejectionMessage, DefaultRejectionMessage); err != nil {
		return c, err
	}
	if utf8.RuneCountInString(c.Instructions) > 4000 || len(c.Cards) > 30 {
		return c, ErrInvalid
	}
	seen, numbers := map[string]bool{}, map[string]bool{}
	active, fixed := 0, false
	for i := range c.Cards {
		card := &c.Cards[i]
		if card.ID == "" {
			card.ID = uuid.NewString()
		}
		if _, err := uuid.Parse(card.ID); err != nil || seen[card.ID] {
			return c, ErrInvalid
		}
		seen[card.ID] = true
		number, bank, err := DetectCard(card.Number)
		if err != nil || numbers[number] {
			return c, ErrInvalid
		}
		numbers[number] = true
		card.Number, card.Bank = number, bank
		card.Owner = strings.TrimSpace(card.Owner)
		if utf8.RuneCountInString(card.Owner) < 2 || utf8.RuneCountInString(card.Owner) > 120 {
			return c, ErrInvalid
		}
		if card.Active {
			active++
			if card.ID == c.FixedCardID {
				fixed = true
			}
		}
	}
	if c.Enabled && (active == 0 || (c.Mode == "fixed" && !fixed) || c.Instructions == "") {
		return c, ErrInvalid
	}
	return c, nil
}

type Price struct {
	Purpose  string `json:"purpose"`
	TargetID string `json:"target_id"`
	Title    string `json:"title"`
	Toman    int64  `json:"toman_price"`
	Stars    int64  `json:"stars"`
	Status   string `json:"status"`
}

type Checkout struct {
	DiscountToman     int64      `json:"discount_toman"`
	CouponCode        string     `json:"coupon_code"`
	DeliveryID        string     `json:"-"`
	OriginalToman     int64      `json:"original_toman"`
	CreditToman       int64      `json:"credit_toman"`
	RemainingDays     int        `json:"remaining_days"`
	WalletStars       int64      `json:"wallet_stars"`
	ExpiresAt         time.Time  `json:"expires_at"`
	ID                string     `json:"id"`
	OrderID           *string    `json:"order_id"`
	UserID            string     `json:"user_id"`
	UserName          string     `json:"user_name"`
	Username          string     `json:"username"`
	Purpose           string     `json:"purpose"`
	TargetID          string     `json:"target_id"`
	Title             string     `json:"title"`
	Toman             int64      `json:"toman"`
	Status            string     `json:"status"`
	IsTest            bool       `json:"is_test"`
	Cards             []Card     `json:"cards"`
	Instructions      string     `json:"instructions"`
	TransactionID     string     `json:"transaction_id"`
	DestinationCardID string     `json:"destination_card_id"`
	HasReceipt        bool       `json:"has_receipt"`
	ReceiptKey        string     `json:"-"`
	ReviewNote        string     `json:"review_note"`
	ReviewedBy        *string    `json:"reviewed_by"`
	ReviewedAt        *time.Time `json:"reviewed_at"`
	CreatedAt         time.Time  `json:"created_at"`
	SubmittedAt       *time.Time `json:"submitted_at"`
}

func ValidPurpose(s string) bool { return s == "product" || s == "vip_plan" || s == "wallet_topup" }

func NormalizeTransactionID(value string) (string, error) {
	value = NormalizeDigits(strings.TrimSpace(value))
	if len(value) > 80 {
		return "", ErrInvalid
	}
	for _, r := range value {
		if !(r >= '0' && r <= '9' || r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' || r == '-') {
			return "", ErrInvalid
		}
	}
	return strings.ToUpper(value), nil
}

func NormalizeDigits(s string) string {
	return strings.Map(func(r rune) rune {
		if r >= '۰' && r <= '۹' {
			return '0' + r - '۰'
		}
		if r >= '٠' && r <= '٩' {
			return '0' + r - '٠'
		}
		return r
	}, s)
}
