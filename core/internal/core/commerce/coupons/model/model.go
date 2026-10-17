package model

import (
	"errors"
	"time"
)

// DiscountType represents the type of discount for a coupon.
type DiscountType string

// Discount type constants.
const (
	DiscountTypeStatic     DiscountType = "static"
	DiscountTypePercentage DiscountType = "percentage"
)

// ValidDiscountTypes returns all valid discount types.
func ValidDiscountTypes() []DiscountType {
	return []DiscountType{
		DiscountTypeStatic,
		DiscountTypePercentage,
	}
}

// IsValid checks if the discount type is valid.
func (dt DiscountType) IsValid() bool {
	for _, valid := range ValidDiscountTypes() {
		if dt == valid {
			return true
		}
	}
	return false
}

// Coupon represents a discount coupon in the system.
type Coupon struct {
	ID            string       `db:"id" json:"id"`
	Code          string       `db:"code" json:"code"`
	DiscountType  DiscountType `db:"discount_type" json:"discount_type"`
	DiscountValue float64      `db:"discount_value" json:"discount_value"`
	UsageLimit    int          `db:"usage_limit" json:"usage_limit"`
	UsageCount    int          `db:"usage_count" json:"usage_count"`
	ExpiresAt     *time.Time   `db:"expires_at" json:"expires_at,omitempty"`
	IsActive      bool         `db:"is_active" json:"is_active"`
	ProductIDs    []string     `db:"product_ids" json:"product_ids"`
	UserIDs       []string     `db:"user_ids" json:"user_ids"`
	CreatedAt     time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time    `db:"updated_at" json:"updated_at"`
}

// Summary counts coupons across the entire catalog, not just a list page.
type Summary struct {
	Active  int64 `json:"active"`
	Expired int64 `json:"expired"`
	Total   int64 `json:"total"`
}

// AppliesToProduct checks if the coupon applies to a specific product.
// Returns true if product_ids is empty (applies to all) or contains the product ID.
func (c *Coupon) AppliesToProduct(productID string) bool {
	if len(c.ProductIDs) == 0 {
		return true // Empty means applies to all products
	}
	for _, id := range c.ProductIDs {
		if id == productID {
			return true
		}
	}
	return false
}

// ErrCouponInactive is returned when the coupon is not active.
var ErrCouponInactive = errors.New("این کد تخفیف غیرفعال است")

// ErrCouponExpired is returned when the coupon has expired.
var ErrCouponExpired = errors.New("مهلت این کد تخفیف تمام شده است")

// ErrCouponUsageLimit is returned when the coupon usage limit has been reached.
var ErrCouponUsageLimit = errors.New("ظرفیت استفاده از این کد تخفیف تمام شده است")

// ErrCouponProductNotApplicable is returned when the coupon does not apply to the specified product.
var ErrCouponProductNotApplicable = errors.New("این کد تخفیف برای این محصول نیست")

var ErrCouponUserNotApplicable = errors.New("این کد تخفیف برای حساب شما قابل استفاده نیست")

func (c *Coupon) AppliesToUser(userID string) bool {
	if len(c.UserIDs) == 0 {
		return true
	}
	for _, id := range c.UserIDs {
		if id == userID {
			return true
		}
	}
	return false
}

// Validate checks whether the coupon is usable. If productID is non-empty,
// it also verifies the coupon applies to that product.
// Returns a descriptive error on failure, or nil if the coupon is valid.
func (c *Coupon) Validate(productID, userID string) error {
	if !c.AppliesToUser(userID) {
		return ErrCouponUserNotApplicable
	}
	if !c.IsActive {
		return ErrCouponInactive
	}
	if c.ExpiresAt != nil && !c.ExpiresAt.After(time.Now()) {
		return ErrCouponExpired
	}
	if c.UsageLimit > 0 && c.UsageCount >= c.UsageLimit {
		return ErrCouponUsageLimit
	}
	if productID != "" && !c.AppliesToProduct(productID) {
		return ErrCouponProductNotApplicable
	}
	return nil
}

func (c *Coupon) CalculateDiscount(totalAmount float64) (discountAmount float64) {
	// Calculate discount
	if c.DiscountType == DiscountTypePercentage {
		discountAmount = totalAmount * (c.DiscountValue / 100)
	} else {
		discountAmount = c.DiscountValue
	}

	// Ensure discount doesn't exceed amount
	if discountAmount > totalAmount {
		return totalAmount
	}
	return discountAmount
}

// NewCoupon constructs a new Coupon with active status, zero usage, and current timestamps.
func NewCoupon(code string, discountType DiscountType, discountValue float64, usageLimit int, expiresAt *time.Time, productIDs []string) *Coupon {
	now := time.Now()
	return &Coupon{
		Code:          code,
		DiscountType:  discountType,
		DiscountValue: discountValue,
		UsageLimit:    usageLimit,
		UsageCount:    0,
		ExpiresAt:     expiresAt,
		IsActive:      true,
		ProductIDs:    productIDs,
		UserIDs:       []string{},
		CreatedAt:     now,
		UpdatedAt:     now,
	}
}

// CouponUpdate holds optional fields for partially updating a coupon.
type CouponUpdate struct {
	Code          *string
	DiscountType  *DiscountType
	DiscountValue *float64
	UsageLimit    *int
	ExpiresAt     *time.Time
	IsActive      *bool
	ProductIDs    *[]string
	UserIDs       *[]string
}

// ApplyUpdates applies non-nil fields from the update to the coupon and sets UpdatedAt.
func (c *Coupon) ApplyUpdates(u CouponUpdate) {
	if u.Code != nil {
		c.Code = *u.Code
	}
	if u.DiscountType != nil {
		c.DiscountType = *u.DiscountType
	}
	if u.DiscountValue != nil {
		c.DiscountValue = *u.DiscountValue
	}
	if u.UsageLimit != nil {
		c.UsageLimit = *u.UsageLimit
	}
	if u.ExpiresAt != nil {
		c.ExpiresAt = u.ExpiresAt
	}
	if u.IsActive != nil {
		c.IsActive = *u.IsActive
	}
	if u.ProductIDs != nil {
		c.ProductIDs = *u.ProductIDs
	}
	if u.UserIDs != nil {
		c.UserIDs = *u.UserIDs
	}
	c.UpdatedAt = time.Now()
}
