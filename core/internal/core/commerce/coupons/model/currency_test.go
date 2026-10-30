package model

import (
	"errors"
	"testing"
)

func TestCouponCurrencies(t *testing.T) {
	c := NewCoupon("BOTH", DiscountTypeStatic, 10, 0, nil, nil)
	c.CurrencyScope, c.TomanDiscountType, c.TomanDiscountValue = "both", DiscountTypeStatic, 50000
	for _, tc := range []struct {
		currency    string
		price, want int64
	}{
		{"stars", 30, 10}, {"toman", 200000, 50000}, {"toman", 40000, 40000},
	} {
		got, err := c.DiscountFor(tc.currency, tc.price)
		if err != nil || got != tc.want {
			t.Fatalf("%+v: %d %v", tc, got, err)
		}
	}
	c.CurrencyScope = "toman"
	c.DiscountValue = 0
	if err := c.ValidateDefinition(); err != nil {
		t.Fatal(err)
	}
	if _, err := c.DiscountStars(30); !errors.Is(err, ErrCurrencyNotApplicable) {
		t.Fatal(err)
	}
	c.CurrencyScope = "stars"
	if err := c.ValidateDefinition(); err == nil {
		t.Fatal("zero active discount accepted")
	}
	c.DiscountValue = 10
	if _, err := c.DiscountFor("toman", 200000); !errors.Is(err, ErrCurrencyNotApplicable) {
		t.Fatal(err)
	}
	c.CurrencyScope = ""
	if got, err := c.DiscountStars(30); err != nil || got != 10 {
		t.Fatal("legacy coupon changed", got, err)
	}
	c.CurrencyScope = "both"
	c.TomanDiscountType = DiscountTypePercentage
	c.TomanDiscountValue = 12.5
	if got, err := c.DiscountFor("toman", 101); err != nil || got != 12 {
		t.Fatal(got, err)
	}
	for _, value := range []float64{0, -1, 100.01} {
		c.TomanDiscountValue = value
		if c.ValidateDefinition() == nil {
			t.Fatal("invalid percentage", value)
		}
	}
	c.TomanDiscountType = DiscountTypeStatic
	c.TomanDiscountValue = 1.5
	if c.ValidateDefinition() == nil {
		t.Fatal("fractional Toman accepted")
	}
}
