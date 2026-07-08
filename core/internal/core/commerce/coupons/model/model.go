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
	CreatedAt     time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time    `db:"updated_at" json:"updated_at"`
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
var ErrCouponInactive = errors.New("coupon is not active")

// ErrCouponExpired is returned when the coupon has expired.
var ErrCouponExpired = errors.New("coupon has expired")

// ErrCouponUsageLimit is returned when the coupon usage limit has been reached.
var ErrCouponUsageLimit = errors.New("coupon usage limit reached")

// ErrCouponProductNotApplicable is returned when the coupon does not apply to the specified product.
var ErrCouponProductNotApplicable = errors.New("coupon does not apply to this product")

// Validate checks whether the coupon is usable. If productID is non-empty,
// it also verifies the coupon applies to that product.
// Returns a descriptive error on failure, or nil if the coupon is valid.
func (c *Coupon) Validate(productID string) error {
	if !c.IsActive {
		return ErrCouponInactive
	}
	if c.ExpiresAt != nil && c.ExpiresAt.Before(time.Now()) {
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
	c.UpdatedAt = time.Now()
}
