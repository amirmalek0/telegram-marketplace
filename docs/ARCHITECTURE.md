
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
"payment_methods": []
}
}

No payment processor is currently enabled. The payment domain stores neutral
method, currency, amount and transaction references so processors can be added
through the processor contract without changing the payment table.

**Broadcasts**
id
title
message
status
sent count
failed count
created at
