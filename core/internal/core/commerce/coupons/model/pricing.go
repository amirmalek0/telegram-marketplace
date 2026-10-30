package model

import (
	"errors"
	"math"
	"math/big"
	"strconv"
	"strings"
	"unicode"
)

var ErrInvalidDefinition = errors.New("تنظیمات کد تخفیف معتبر نیست")
var ErrNoDiscount = errors.New("این کد برای قیمت محصول تخفیف قابل استفاده‌ای ندارد")

// Codes are case-sensitive, matching the existing coupon API and unique index.
func NormalizeCode(code string) string { return strings.TrimSpace(code) }

func (c *Coupon) Scope() string {
	if c.CurrencyScope == "" {
		return "stars"
	}
	return c.CurrencyScope
}

var ErrCurrencyNotApplicable = errors.New("این کد تخفیف برای واحد قیمت انتخاب‌شده قابل استفاده نیست")

func (c *Coupon) ValidateDefinition() error {
	if c.Scope() != "stars" && c.Scope() != "toman" && c.Scope() != "both" {
		return ErrInvalidDefinition
	}
	if c.Code == "" || len([]rune(c.Code)) > 64 || strings.ContainsFunc(c.Code, unicode.IsSpace) || c.UsageLimit < 0 {
		return ErrInvalidDefinition
	}
	if c.Scope() != "toman" {
		if err := validateDiscount(c.DiscountType, c.DiscountValue); err != nil {
			return err
		}
	}
	if c.Scope() != "stars" {
		return validateDiscount(c.TomanDiscountType, c.TomanDiscountValue)
	}
	return nil
}

func validateDiscount(kind DiscountType, amount float64) error {
	if !kind.IsValid() || math.IsNaN(amount) || math.IsInf(amount, 0) || amount <= 0 {
		return ErrInvalidDefinition
	}
	if kind == DiscountTypePercentage && amount > 100 {
		return ErrInvalidDefinition
	}
	if kind == DiscountTypeStatic && (math.Trunc(amount) != amount || amount > 9007199254740991) {
		return ErrInvalidDefinition
	}
	return nil
}

// DiscountStars rounds percentage discounts down to whole Stars. Rational math
// avoids binary floating-point rounding and multiplication overflow.
func (c *Coupon) DiscountStars(price int64) (int64, error) { return c.DiscountFor("stars", price) }
func (c *Coupon) DiscountFor(currency string, price int64) (int64, error) {
	if currency != "stars" && currency != "toman" {
		return 0, ErrCurrencyNotApplicable
	}
	if c.Scope() != "both" && c.Scope() != currency {
		return 0, ErrCurrencyNotApplicable
	}
	if err := c.ValidateDefinition(); err != nil {
		return 0, err
	}
	if price <= 0 {
		return 0, ErrNoDiscount
	}
	kind, amount := c.DiscountType, c.DiscountValue
	if currency == "toman" {
		kind, amount = c.TomanDiscountType, c.TomanDiscountValue
	}
	value, ok := new(big.Rat).SetString(strconv.FormatFloat(amount, 'f', -1, 64))
	if !ok {
		return 0, ErrInvalidDefinition
	}
	if kind == DiscountTypePercentage {
		value.Mul(value, new(big.Rat).SetInt64(price))
		value.Quo(value, big.NewRat(100, 1))
	}
	if value.Cmp(new(big.Rat).SetInt64(price)) >= 0 {
		return price, nil
	}
	discount := new(big.Int).Quo(value.Num(), value.Denom()).Int64()
	if discount <= 0 {
		return 0, ErrNoDiscount
	}
	return discount, nil
}
