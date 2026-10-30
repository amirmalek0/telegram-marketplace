package manual

import (
	"fmt"
	"strings"
)

type ReviewNotice struct {
	Title, Message, ActionPath string
	Vars                       map[string]string
}

// Keep status and test-mode warnings outside the editable body. The rendered
// message is snapshotted with the review, shared by the private inbox and bot.
func BuildReviewNotice(c *Checkout, approved bool, note string, configs ...Config) ReviewNotice {
	config := DefaultConfig()
	if len(configs) > 0 {
		config = configs[0]
	}
	result := ReviewNotice{Title: "پرداخت کارت‌به‌کارت رد شد", ActionPath: "/orders"}
	template, fallback := config.RejectionMessage, DefaultRejectionMessage
	outcome := "پرداخت رد شد."
	if approved {
		result.Title = "پرداخت کارت‌به‌کارت تأیید شد"
		template, fallback = config.ApprovalMessage, DefaultApprovalMessage
		note = "" // Internal approval notes must never reach the customer.
		outcome = "پرداخت تأیید شد."
		if !c.IsTest {
			switch c.Purpose {
			case "product":
				result.ActionPath = "/products/" + c.TargetID
				outcome = "وضعیت تحویل و دسترسی خرید را در صفحه محصول مشاهده کنید."
			case "vip_plan":
				result.ActionPath = "/vip"
				outcome = "اشتراک VIP شما فعال شد؛ جزئیات و تاریخ اعتبار در مینی‌اپ قابل مشاهده است."
			case "wallet_topup":
				result.ActionPath = "/wallet"
				outcome = fmt.Sprintf("%d ⭐ به موجودی کیف پول فروشگاه شما اضافه شد.", c.WalletStars)
			}
		}
	}
	if strings.TrimSpace(template) == "" {
		template = fallback
	}
	result.Vars = map[string]string{"user_name": trimNotice(c.UserName, 120), "title": trimNotice(c.Title, 180), "amount_toman": fmt.Sprint(c.Toman), "payment_id": c.ID, "reason": trimNotice(note, 500), "result": outcome, "status": result.Title, "test_notice": "", "action_path": result.ActionPath}
	body := renderNoticeTemplate(template, c, note, outcome)
	// Preserve a usable rejection reason even when the template omits it.
	if !approved && !strings.Contains(template, "{reason}") {
		body = boundNotice(body, 2100) + "\nدلیل بررسی: " + trimNotice(note, 1000)
	}
	body = boundNotice(body, 3200)
	if c.IsTest {
		result.Title += " (آزمایشی)"
		result.Vars["status"] = result.Title
		result.Vars["test_notice"] = "این پرداخت آزمایشی است؛ هیچ محصول، اشتراک یا موجودی واقعی اعطا نشده است."
		body += "\nاین پرداخت آزمایشی است؛ هیچ محصول، اشتراک یا موجودی واقعی اعطا نشده است."
	}
	result.Message = result.Title + "\n" + body
	return result
}

func trimNotice(s string, limit int) string {
	runes := []rune(strings.TrimSpace(s))
	if len(runes) > limit {
		return string(runes[:limit]) + "…"
	}
	return string(runes)
}
