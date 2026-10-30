package manual

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"unicode/utf16"
)

func TestNoticeTemplateValidation(t *testing.T) {
	for _, invalid := range []string{"{unknown}", "{title", "{{title}}", strings.Repeat("x", 2001)} {
		c := DefaultConfig()
		c.ApprovalMessage = invalid
		if _, err := ValidateConfig(c); !errors.Is(err, ErrInvalid) {
			t.Fatalf("accepted %q: %v", invalid, err)
		}
	}
	c := DefaultConfig()
	c.ApprovalMessage, c.RejectionMessage = " ", ""
	c, err := ValidateConfig(c)
	if err != nil || c.ApprovalMessage != DefaultApprovalMessage || c.RejectionMessage != DefaultRejectionMessage {
		t.Fatal(c, err)
	}
	legacy := DefaultConfig()
	if err := json.Unmarshal([]byte(`{"mode":"random","cards":[]}`), &legacy); err != nil || legacy.ApprovalMessage != DefaultApprovalMessage {
		t.Fatal(legacy, err)
	}
}

func TestCustomNoticeRendering(t *testing.T) {
	c := &Checkout{ID: "payment-id", Title: "عنوان {reason}", UserName: "علی", Toman: 100, Purpose: "wallet_topup", WalletStars: 10}
	config := DefaultConfig()
	config.ApprovalMessage = "سلام {user_name}\n{title}: {amount_toman}\n{payment_id}\n{result}\n{reason}"
	n := BuildReviewNotice(c, true, "private approval note", config)
	for _, want := range []string{"سلام علی", "عنوان {reason}: 100", "payment-id", "10 ⭐"} {
		if !strings.Contains(n.Message, want) {
			t.Fatal(n)
		}
	}
	if strings.Contains(n.Message, "private approval note") {
		t.Fatal(n)
	}
	config.RejectionMessage = "لطفاً با پشتیبانی تماس بگیرید."
	n = BuildReviewNotice(c, false, "مبلغ نادرست", config)
	if !strings.Contains(n.Message, config.RejectionMessage) || !strings.Contains(n.Message, "مبلغ نادرست") {
		t.Fatal(n)
	}
	c.IsTest = true
	n = BuildReviewNotice(c, true, "", config)
	if !strings.Contains(n.Message, "هیچ محصول، اشتراک یا موجودی واقعی") || strings.Contains(n.Message, "10 ⭐") {
		t.Fatal(n)
	}
	config.RejectionMessage = strings.Repeat("{reason}", 200)
	n = BuildReviewNotice(c, false, strings.Repeat("😀", 1000), config)
	if len(utf16.Encode([]rune(n.Message))) > 4096 {
		t.Fatal("Telegram limit exceeded")
	}
}
