package model

import (
	"strings"
	"testing"
)

func TestReferralMessageTemplates(t *testing.T) {
	for _, tc := range []struct {
		template, role string
		valid          bool
	}{
		{DefaultInviterMessage, "inviter", true}, {DefaultInviteeMessage, "invitee", true},
		{"{amount} {invitee_name}", "inviter", true}, {"{amount} {inviter_name}", "invitee", true},
		{"", "inviter", false}, {"  ", "invitee", false}, {"hello {invitee_name}", "inviter", false},
		{"{amount} {invitee_name}", "invitee", false}, {"{amount} {inviter_name} {unknown}", "invitee", false},
		{strings.Repeat("a", 2001) + "{amount} {invitee_name}", "inviter", false},
		{"{amount}" + strings.Repeat("{invitee_name}", 30), "inviter", false},
	} {
		if got := ValidMessage(tc.template, tc.role); got != tc.valid {
			t.Fatalf("validation got %v want %v: %q", got, tc.valid, tc.template)
		}
	}
	message := RenderMessage("{amount} credits: {inviter_name} invited {invitee_name}", 17, "Amir <admin>", "Sara {amount}")
	if message != "17 credits: Amir <admin> invited Sara {amount}" {
		t.Fatal(message)
	}
	if DisplayName("", "", "amir") != "@amir" {
		t.Fatal("username fallback")
	}
	if DisplayName("", "", "") != "کاربر فروشگاه" {
		t.Fatal("empty name fallback")
	}
	if DisplayName("A\n\u202e", "B", "") != "A B" {
		t.Fatal("control character sanitation")
	}
	if len([]rune(DisplayName(strings.Repeat("x", 200), "", ""))) != 100 {
		t.Fatal("name length not bounded")
	}
}
