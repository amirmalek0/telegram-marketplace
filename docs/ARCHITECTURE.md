
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
stars_price
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
"payment_method": "telegram_stars"
}
}

Telegram Stars is the only enabled method. The payment domain stores neutral
method, currency, amount and transaction references so future processors can be
added through the processor contract without changing the payment table.
Orders can only be created by an enabled provider checkout; there is no generic
order-creation endpoint and administrators cannot manually mark an order paid.

Stars checkout flow:

1. An admin assigns every sellable product an integer `stars_price`.
2. The Mini App calls `POST /api/v1/payment/stars/invoice` with authenticated
   Telegram Mini App init data. The API creates a pending order, payment, and
   delivery snapshot, reserving inventory when required.
3. The API calls Telegram `createInvoiceLink` with currency `XTR`; the Mini App
   opens the returned URL through Telegram's native invoice UI.
4. The bot revalidates user, payload, currency, amount, order state, and stock
   for `pre_checkout_query` and answers it within Telegram's deadline.
5. Only Telegram's `successful_payment` update can atomically mark the payment
   succeeded and order paid. Its `telegram_payment_charge_id` is retained for
   reconciliation/refunds and used as an idempotency key.
6. `GET /api/v1/payment/deliveries` exposes only the authenticated buyer's paid
   delivery, using short-lived download URLs and never exposing source IDs.

An administrator controls the global mode from the backoffice Payments page.
Production mode creates a real Telegram Stars invoice with the production bot.
Test mode skips Telegram and presents deterministic success, failure, and
cancellation controls in the Mini App. Every payment persists its `is_test`
mode at creation time, so production payments can never enter the simulator.
The simulator still requires the authenticated user to own the pending payment
and invokes the same settlement, fulfillment, and inventory-release paths.

**Broadcasts**
id
title
message
status
sent count
failed count
created at
