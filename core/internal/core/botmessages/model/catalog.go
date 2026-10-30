package model

import (
	manual "telegram-marketplace/internal/core/commerce/payments/manual"
	referral "telegram-marketplace/internal/core/membership/referrals/model"
)

var IdentityVariables = []string{"first_name", "last_name", "user_name", "username", "telegram_id"}

func definition(key, name, group, kind, text string, limit int, variables []string) Definition {
	return Definition{Key: key, Name: name, Group: group, Kind: kind, Limit: limit, Variables: variables, Default: Template{Key: key, Name: name, Text: text, Enabled: true, Format: "plain", Rows: [][]Button{}, ContactLabel: "", ContactStyle: ""}}
}
func Definitions() []Definition {
	list := []Definition{
		definition("start", "شروع و خوش‌آمدگویی", "عمومی", "message", "به فروشگاه خوش آمدید. مینی‌اپ را از منوی ربات یا دکمه زیر باز کنید.", 4096, IdentityVariables),
		definition("phone.request", "درخواست شماره تلفن", "تأیید شماره", "contact", "برای تأیید شماره حساب تلگرام خود، دکمه زیر را بزنید. شماره فقط برای حساب خود شما ثبت می‌شود.", 4096, IdentityVariables),
		definition("phone.verified", "تأیید موفق شماره", "تأیید شماره", "message", "شماره تلفن شما تأیید شد ✅\nاکنون می‌توانید به مینی‌اپ برگردید.", 4096, IdentityVariables),
		definition("payment.succeeded", "پرداخت موفق Stars", "پرداخت", "message", "پرداخت شما با موفقیت انجام شد ✅\nحساب شما در مینی‌اپ به‌روزرسانی شده است.", 4096, append(append([]string{}, IdentityVariables...), "amount")),
		definition("payment.refunded", "بازپرداخت Stars", "پرداخت", "message", "این سفارش قابل تکمیل نبود؛ مبلغ پرداخت به حساب تلگرام شما بازگردانده شد.", 4096, IdentityVariables),
		definition("checkout.phone_required", "خطای پرداخت: شماره تأیید نشده", "پرداخت", "alert", "ابتدا شماره تلفن خود را در مینی‌اپ تأیید کنید.", 200, []string{}),
		definition("checkout.invalid", "خطای پرداخت نامعتبر یا منقضی", "پرداخت", "alert", "این پرداخت معتبر نیست یا منقضی شده است.", 200, []string{}),
		definition("referral.inviter", "پاداش دعوت‌کننده", "دعوت", "message", referral.DefaultInviterMessage, 4096, []string{"amount", "inviter_name", "invitee_name"}),
		definition("referral.invitee", "پاداش فرد دعوت‌شده", "دعوت", "message", referral.DefaultInviteeMessage, 4096, []string{"amount", "inviter_name", "invitee_name"}),
		definition("manual.approved", "تأیید کارت‌به‌کارت", "پرداخت", "message", manual.DefaultApprovalMessage, 3000, []string{"user_name", "title", "amount_toman", "payment_id", "reason", "result", "status", "test_notice", "action_path"}),
		definition("manual.rejected", "رد کارت‌به‌کارت", "پرداخت", "message", manual.DefaultRejectionMessage, 3000, []string{"user_name", "title", "amount_toman", "payment_id", "reason", "result", "status", "test_notice", "action_path"}),
	}
	for _, purpose := range []struct{ key, name string }{{"product", "محصول"}, {"vip_plan", "VIP"}, {"wallet_topup", "کیف پول"}} {
		list = append(list, definition("invoice."+purpose.key+".title", "عنوان فاکتور "+purpose.name, "فاکتور تلگرام", "invoice", "{title}", 32, []string{"title", "description", "amount"}))
		list = append(list, definition("invoice."+purpose.key+".description", "توضیح فاکتور "+purpose.name, "فاکتور تلگرام", "invoice", "{description}", 255, []string{"title", "description", "amount"}))
	}
	list[0].Default.Rows = [][]Button{{{Text: "ورود به فروشگاه", Action: "miniapp", Value: "/", Style: ""}}}
	list[1].Default.ContactLabel = "اشتراک‌گذاری شماره من"
	return list
}
func Find(key string) (Definition, bool) {
	for _, d := range Definitions() {
		if d.Key == key {
			return d, true
		}
	}
	return Definition{}, false
}
func Defaults() Config {
	c := Config{Messages: []Template{}}
	for _, d := range Definitions() {
		c.Messages = append(c.Messages, d.Default)
	}
	return c
}
