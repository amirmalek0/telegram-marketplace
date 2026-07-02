
# Enterprise Blueprint

Modules:
- Users
- Products
- Orders
- Payments
- VIP
- Referrals
- Tickets
- Broadcasts
- Settings
- Analytics

Processes:
- API
- Telegram Bot
- Worker


Entities:

**Order**
id
user id
product id
amount
payment method
status
paid at
created at

**Payment**
id
order id
provider
gateway trx id
amount
status

**Plans**
id
title
price
duration
status

**Subscriptions**
id
user id
plan id
start date
end date

**Referrals**
id
referrer user id
referred user id
reward amount
created at

**Coupons**
id
code
discount type (static/percentage)
discount value
usage limit
expires at

**BOT Settings**
key(TEXT)
value(jsonB)
updated at


{
"id": "cfg_main",
"settings": {
"shop_mode": "categories",
"show_views": true,
"enable_referrals": true,
"enable_vip": true,
"enable_support": true,
"payment_methods": [
"zarinpal",
"zibal",
"idpay",
"payping",
"crypto",
"ton",
"stars",
"manual_card"
]
}
}

**Broadcasts**
id
title
message
status
sent count
failed count
created at
