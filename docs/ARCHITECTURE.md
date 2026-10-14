
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

Backend modules follow the same dependency direction: HTTP router and handler,
service business logic, repository contract/implementation, then model. Services
must not depend on the database pool or execute SQL directly. Repository SQL is
kept in an adjacent `queries.go` or `*_queries.go` file; repository methods own
transactions and reference those named query constants.

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
   Passing `product_id` limits the result to that product for direct access on
   its detail page. Every paid order retains its own delivery snapshot, so a
   buyer can purchase the same product repeatedly without an ownership limit.

MinIO is private to the Docker network. Presigned object URLs are exposed as
same-origin `/storage/<bucket>/<object>` paths; the Mini App and backoffice
proxies remove `/storage` and preserve MinIO's signed internal Host. This keeps
links valid through HTTPS tunnels without exposing `minio:9000` or localhost.

An administrator controls the global mode from the backoffice General Settings page.
Production mode creates a real Telegram Stars invoice with the production bot.
Test mode skips Telegram and presents deterministic success, failure, and
cancellation controls in the Mini App. Every payment persists its `is_test`
mode at creation time, so production payments can never enter the simulator.
The simulator still requires the authenticated user to own the pending payment
and invokes the same settlement, fulfillment, and inventory-release paths.

Mini App content:

- User-interface copy has stable keys and frontend fallbacks. The public
  `GET /api/v1/miniapp-content` endpoint returns only administrator overrides,
  so the Mini App remains usable if no override exists or content loading fails.
- `PUT /api/v1/miniapp-content/:key` and
  `DELETE /api/v1/miniapp-content/:key` are admin-only and respectively save
  an override or restore the versioned default.
- The backoffice route `/miniapp-content` embeds the live Mini App in editor
  mode. Admin JWT credentials are transferred to the frame with a trusted-origin
  `postMessage` handshake and are never placed in its URL.
- Dynamic phrases use named placeholders such as `{count}` and `{date}` so an
  administrator can edit the sentence while preserving runtime values.
- Editor mode provides route-specific preview scenarios for populated, empty,
  loading, error, payment, access, and lifecycle states. These scenarios use
  isolated fixtures and never impersonate a Telegram user or execute payments.
- `MINIAPP_PUBLIC_URL` controls the browser URL embedded by the backoffice and
  must point to the public Mini App origin in deployed environments.

**Broadcasts**
id
title
message
status
sent count
failed count
created at
