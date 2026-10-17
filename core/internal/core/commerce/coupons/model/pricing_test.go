package model

import (
	"math"
	"testing"
	"time"
)

func TestDiscountStars(t *testing.T) {
	for _, tc := range []struct {
		kind        DiscountType
		value       float64
		price, want int64
		fails       bool
	}{
		{DiscountTypePercentage, 25, 10, 2, false},
		{DiscountTypePercentage, 12.5, 80, 10, false},
		{DiscountTypePercentage, 100, 10, 10, false},
		{DiscountTypeStatic, 99, 10, 10, false},
		{DiscountTypeStatic, 3, 10, 3, false},
		{DiscountTypePercentage, 1, 1, 0, true},
		{DiscountTypeStatic, 1.5, 10, 0, true},
		{DiscountTypePercentage, 101, 10, 0, true},
		{DiscountTypeStatic, math.Inf(1), 10, 0, true},
	} {
		c := NewCoupon("TEST", tc.kind, tc.value, 0, nil, nil)
		got, err := c.DiscountStars(tc.price)
		if (err != nil) != tc.fails || got != tc.want {
			t.Fatalf("%+v got %d err %v", tc, got, err)
		}
	}
}

func TestCouponEligibility(t *testing.T) {
	c := NewCoupon("TEST", DiscountTypeStatic, 3, 1, nil, []string{"allowed"})
	if err := c.Validate("other", "user"); err == nil {
		t.Fatal("product restriction ignored")
	}
	if err := c.Validate("allowed", "user"); err != nil {
		t.Fatal(err)
	}
	c.UsageCount = 1
	if err := c.Validate("allowed", "user"); err == nil {
		t.Fatal("limit ignored")
	}
	c.UsageCount = 0
	c.IsActive = false
	if err := c.Validate("allowed", "user"); err == nil {
		t.Fatal("inactive accepted")
	}
	c.IsActive = true
	expired := time.Now().Add(-time.Second)
	c.ExpiresAt = &expired
	if err := c.Validate("allowed", "user"); err == nil {
		t.Fatal("expired accepted")
	}
}
