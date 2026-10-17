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

func (c *Coupon) ValidateDefinition() error {
	if c.Code == "" || len([]rune(c.Code)) > 64 || strings.ContainsFunc(c.Code, unicode.IsSpace) ||
		!c.DiscountType.IsValid() || math.IsNaN(c.DiscountValue) || math.IsInf(c.DiscountValue, 0) ||
		c.DiscountValue <= 0 || c.UsageLimit < 0 {
		return ErrInvalidDefinition
	}
	if c.DiscountType == DiscountTypePercentage && c.DiscountValue > 100 {
		return ErrInvalidDefinition
	}
	if c.DiscountType == DiscountTypeStatic && (math.Trunc(c.DiscountValue) != c.DiscountValue || c.DiscountValue > 9007199254740991) {
		return ErrInvalidDefinition
	}
	return nil
}

// DiscountStars rounds percentage discounts down to whole Stars. Rational math
// avoids binary floating-point rounding and multiplication overflow.
func (c *Coupon) DiscountStars(price int64) (int64, error) {
	if err := c.ValidateDefinition(); err != nil {
		return 0, err
	}
	if price <= 0 {
		return 0, ErrNoDiscount
	}
	value, ok := new(big.Rat).SetString(strconv.FormatFloat(c.DiscountValue, 'f', -1, 64))
	if !ok {
		return 0, ErrInvalidDefinition
	}
	if c.DiscountType == DiscountTypePercentage {
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
