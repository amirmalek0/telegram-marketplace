package manual

import (
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

const DefaultApprovalMessage = "خرید: {title}\nمبلغ: {amount_toman} تومان\nشناسه پرداخت: {payment_id}\n{result}\nجزئیات را از بخش اعلان‌های مینی‌اپ پیگیری کنید."
const DefaultRejectionMessage = "خرید: {title}\nمبلغ: {amount_toman} تومان\nشناسه پرداخت: {payment_id}\nدلیل بررسی: {reason}\nدر صورت واریز وجه، برای پیگیری یا بازگشت وجه با پشتیبانی تماس بگیرید."

var noticeToken = regexp.MustCompile(`\{([^{}]*)\}`)
var noticeTokens = map[string]bool{"title": true, "amount_toman": true, "payment_id": true, "user_name": true, "reason": true, "result": true}

func validateNoticeTemplate(value, fallback string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback, nil
	}
	if utf8.RuneCountInString(value) > 2000 {
		return "", fmt.Errorf("%w: متن پیام حداکثر ۲۰۰۰ نویسه است", ErrInvalid)
	}
	for _, match := range noticeToken.FindAllStringSubmatch(value, -1) {
		if !noticeTokens[match[1]] {
			return "", fmt.Errorf("%w: متغیر پیام پشتیبانی نمی‌شود: %s", ErrInvalid, match[0])
		}
	}
	if strings.ContainsAny(noticeToken.ReplaceAllString(value, ""), "{}") {
		return "", fmt.Errorf("%w: قالب متغیرهای پیام معتبر نیست", ErrInvalid)
	}
	return value, nil
}

// Single-pass expansion: customer text containing placeholders is never evaluated.
func renderNoticeTemplate(template string, c *Checkout, reason, result string) string {
	values := map[string]string{
		"title": trimNotice(c.Title, 180), "amount_toman": fmt.Sprint(c.Toman),
		"payment_id": c.ID, "user_name": trimNotice(c.UserName, 120),
		"reason": trimNotice(reason, 1000), "result": result,
	}
	return noticeToken.ReplaceAllStringFunc(template, func(token string) string { return values[token[1:len(token)-1]] })
}

// Telegram's length budget counts UTF-16 units, including two for emoji.
func boundNotice(value string, limit int) string {
	units := 0
	for index, r := range value {
		units++
		if r > 0xffff {
			units++
		}
		if units > limit {
			return value[:index] + "…"
		}
	}
	return value
}
