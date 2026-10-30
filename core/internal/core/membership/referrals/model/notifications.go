package model

import (
	"regexp"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

const DefaultInviterMessage = "🎉 {inviter_name} عزیز، با دعوت شما از {invitee_name}، مبلغ {amount} استار به کیف پول فروشگاه شما اضافه شد.\nاین اعتبار برای خرید در فروشگاه است، نه موجودی استار تلگرام."
const DefaultInviteeMessage = "🎁 {invitee_name} عزیز، بابت ورود با دعوت {inviter_name}، مبلغ {amount} استار به کیف پول فروشگاه شما اضافه شد.\nاین اعتبار برای خرید در فروشگاه است، نه موجودی استار تلگرام."

var placeholder = regexp.MustCompile(`\{[^{}]*\}`)

// Plain text only: Telegram parse_mode is deliberately not enabled.
func RenderMessage(template string, amount int64, inviter, invitee string) string {
	return strings.NewReplacer("{amount}", strconv.FormatInt(amount, 10), "{inviter_name}", inviter, "{invitee_name}", invitee).Replace(template)
}

func ValidMessage(template, role string) bool {
	if strings.TrimSpace(template) == "" || utf8.RuneCountInString(template) > 2000 || !strings.Contains(template, "{amount}") {
		return false
	}
	other := "{inviter_name}"
	if role == "inviter" {
		other = "{invitee_name}"
	}
	if !strings.Contains(template, other) {
		return false
	}
	for _, token := range placeholder.FindAllString(template, -1) {
		if token != "{amount}" && token != "{inviter_name}" && token != "{invitee_name}" {
			return false
		}
	}
	// Bound expansion, including repeated placeholders and astral Unicode names.
	rendered := RenderMessage(template, 1000000, strings.Repeat("😀", 100), strings.Repeat("😀", 100))
	units := 0
	for _, r := range rendered {
		units++
		if r > 0xffff {
			units++
		}
	}
	return units <= 4096
}

func DisplayName(first, last, username string) string {
	name := strings.TrimSpace(first + " " + last)
	if name == "" && username != "" {
		name = "@" + username
	}
	name = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || unicode.In(r, unicode.Cf) {
			return -1
		}
		return r
	}, name)
	if strings.TrimSpace(name) == "" {
		name = "کاربر فروشگاه"
	}
	runes := []rune(name)
	if len(runes) > 100 {
		name = string(runes[:100])
	}
	return name
}

type Notification struct {
	Role       string
	Vars       map[string]string
	ID         string
	ChatID     int64
	Message    string
	Attempts   int
	LeaseToken string
}
