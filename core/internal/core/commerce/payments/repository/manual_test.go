package repository

import (
	"telegram-marketplace/internal/core/commerce/payments/manual"
	"testing"
)

func TestManualCardSelection(t *testing.T) {
	c := manual.Config{Cards: []manual.Card{{ID: "a", Active: true}, {ID: "b", Active: false}, {ID: "c", Active: true}}}
	c.Mode = "multiple"
	cards, err := chooseManualCards(&c)
	if err != nil || len(cards) != 2 {
		t.Fatal(cards, err)
	}
	c.Mode = "fixed"
	c.FixedCardID = "c"
	cards, err = chooseManualCards(&c)
	if err != nil || len(cards) != 1 || cards[0].ID != "c" {
		t.Fatal(cards, err)
	}
	c.FixedCardID = "b"
	if _, err = chooseManualCards(&c); err == nil {
		t.Fatal("inactive fixed card selected")
	}
	c.Mode = "random"
	for i := 0; i < 50; i++ {
		cards, err = chooseManualCards(&c)
		if err != nil || len(cards) != 1 || cards[0].ID == "b" {
			t.Fatal(cards, err)
		}
	}
	if len(c.Cards) != 3 {
		t.Fatal("selection mutated config")
	}
}
