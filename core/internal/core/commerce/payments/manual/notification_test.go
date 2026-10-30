package manual

import (
	"strings"
	"testing"
	"unicode/utf8"
)

func TestReviewNotice(t *testing.T) {
	for _, purpose := range []string{"product", "vip_plan", "wallet_topup"} {
		c := &Checkout{ID: "payment-id", TargetID: "product-id", Title: "خرید آزمایشی", Purpose: purpose, Toman: 125000, WalletStars: 50}
		n := BuildReviewNotice(c, true, "internal admin note")
		if !strings.Contains(n.Message, "125000 تومان") || !strings.Contains(n.Message, c.ID) || strings.Contains(n.Message, "internal admin note") {
			t.Fatal(n)
		}
		paths := map[string]string{"product": "/products/product-id", "vip_plan": "/vip", "wallet_topup": "/wallet"}
		if n.ActionPath != paths[purpose] {
			t.Fatal(n)
		}
		n = BuildReviewNotice(c, false, "مبلغ واریزی مطابقت ندارد")
		if !strings.Contains(n.Title, "رد شد") || !strings.Contains(n.Message, "مبلغ واریزی مطابقت ندارد") || strings.Contains(n.Message, "فعال شد") {
			t.Fatal(n)
		}
		c.IsTest = true
		n = BuildReviewNotice(c, true, "")
		if !strings.Contains(n.Title, "آزمایشی") || !strings.Contains(n.Message, "هیچ محصول، اشتراک یا موجودی واقعی") || strings.Contains(n.Message, "اضافه شد") {
			t.Fatal(n)
		}
	}
}

func TestReviewNoticeBounds(t *testing.T) {
	n := BuildReviewNotice(&Checkout{Title: strings.Repeat("نام", 10000)}, false, strings.Repeat("دلیل", 10000))
	if utf8.RuneCountInString(n.Message) > 3000 {
		t.Fatal("notice too long for Telegram")
	}
}
