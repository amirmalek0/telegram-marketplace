
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

- Rewards credit the inviter and invitee's store wallets once, using the amounts
  and eligibility trigger captured when the referral was created.
- Admin settings (`/settings/referrals`) include separate `inviter_message` and
  `invitee_message` plain-text templates. Supported placeholders: `{amount}`,
  `{inviter_name}`, `{invitee_name}`. Each message must include the recipient's
  credit amount and the other person's name. Names are bounded and sanitized.
- The reward transaction also creates one `referral_notifications` outbox row
  per positive credit. Text/names are snapshotted at payout. No notices are
  backfilled for historical payouts; zero credits do not send notices.
- The bot worker drains the outbox every 30 seconds, even when new referrals
  have since been disabled. Exclusive leases prevent concurrent sends, and
  temporary failures back off from one minute up to one hour. Permanent Telegram
  400/403 failures stop retrying without reversing wallet credits.
- Delivery is at-least-once: Telegram does not provide a sendMessage idempotency
  key, so a crash/lost response after Telegram accepts a message can produce a
  duplicate notice. Wallet rewards remain exactly-once. Users must have started
  the bot and not blocked it to receive a direct message.

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

Customer avatars are persisted in `users.photo_url` from verified Telegram Mini
App profile data, never from the request body or an admin-editable photo field.
Only HTTPS image URLs are accepted. A signed Mini App profile without a photo
clears an older avatar, while ordinary bot updates preserve it. Admin user and
wallet responses include this URL and the saved phone number; unavailable images
use a UI fallback. Existing users receive photos when they next open the Mini App.

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

The admin-only `GET /api/v1/payment/stars` list adds payer identity, the product,
VIP plan or wallet-pack title, and product order/coupon details to each attempt.
Purchased titles prefer delivery/checkout snapshots over current catalog names.
Its `summary` covers all Stars attempts, not just the requested page; counts
include test attempts, while `paid_stars` sums only successful non-test payments
and excludes refunds. Raw provider and checkout JSON are never returned. This
admin DTO is separate from customer-facing payment responses. The backoffice
detail view exposes copy controls for every available identifier. Quick search
and status filters apply to the loaded records and are labeled accordingly.

User profile photos:

- `membership/userphotos` owns the private `user-profile-photos` bucket
  (`USER_PROFILE_PHOTOS_BUCKET`), gallery metadata, and durable import queue.
  Its SQL lives alongside the repository in `queries.go`.
- The API worker seeds existing users and queues newly onboarded users, imports
  all photos available through `getUserProfilePhotos` in batches of 100, and
  refreshes daily. Only the largest size is stored, deduplicated by Telegram's
  file-unique ID. Telegram privacy rules can limit the available history.
- Mini App onboarding (`POST /api/v1/user`) also queues a background refresh
  when the last successful sync and last attempt are at least 15 minutes old.
  Repeated visits are coalesced atomically in PostgreSQL, including across API
  replicas/restarts. Visits never reset pending pages, active leases, or failed
  retries. Profile/Wallet/VIP reloads use the same endpoint and cooldown; bot
  `/start` only ensures the initial photo job exists. No Telegram request is
  made in the onboarding HTTP request itself.
- Sync leases survive restarts; failures retry after 15 minutes. Admin refresh
  is rate-limited to once per minute per user. Imports never fetch supplied
  `photo_url` addresses or expose bot tokens/file IDs/storage keys to clients.
- Admins use `GET /api/v1/user/:id/photos?offset=0` (30 photos per page) and
  `POST /api/v1/user/:id/photos/sync`. Images are streamed through
  `GET /api/v1/user/:id/photos/:photoID/content`, authorized for admins or the
  owning Telegram user only. Clients fetch authenticated blobs, not public URLs.
- `users.photo_url` points at the stored current avatar after a successful
  import. Older saved photos remain in the gallery even if Telegram no longer
  lists them. Deleting a user cascades metadata and durably queues storage
  cleanup; the API worker removes those objects. Saved dates are archive dates,
  not dates the photos were originally uploaded to Telegram.

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

- Admin: `/broadcasts` in the backoffice publishes plain-text announcements to
  every user's miniapp inbox. This does not send Telegram chat messages or push notifications.
- Miniapp: the header bell opens `/notifications`; unread counts and inbox content
  refresh every 30 seconds while visible and when the app becomes visible again.
- Admin API: `GET /broadcast`, `POST /broadcast` (title, message, UUID request_id),
  `DELETE /broadcast/:id` (archive). Publishing retries reuse the request ID.
- User API: `GET /notification`, `GET /notification/unread-count`,
  `POST /notification/:id/read`, `POST /notification/read-all`.
- `broadcast_reads` tracks each user's first read independently. Archived items
  leave all user inboxes but retain admin history/read counts. New users can see
  all currently published, non-archived announcements.
- Uses the existing authenticated, role-guarded and phone-verification-protected
  routes; SQL remains alongside the repository. No per-user fan-out is needed.
- Database regression test (disposable schema, no real announcements): set
  `BROADCAST_TEST_DATABASE_URL` and run
  `go test ./internal/core/membership/broadcasts/... -count=1` from `core`.
