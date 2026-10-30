# Manual Iranian card-to-card payments

Admin entry points: **Payments → Card-to-card** and **General settings → Card-to-card settings**.

The method starts disabled, with no destination cards and no Toman prices. Configure cards, their owners, instructions, and display mode (random, fixed, or all active cards). The server validates normalized 16-digit card numbers with Luhn and detects the issuing bank locally. Prefix detection does not verify ownership or that an account remains active. Logos use the MIT-licensed `@snapp-store/iranian-banks-react-icons` package; prefix attribution is alongside the backend registry.

Set separate whole-Toman prices directly in each product editor, VIP plan editor, and wallet top-up pack editor; there is no separate pricing tab. Zero disables this method for that item. Stars pricing is unchanged. Wallet packs credit store-wallet Stars, not Telegram Stars. Existing Stars coupons are not applied to Toman prices. VIP upgrades use remaining time and the configured Toman price of the current plan, capped to keep a positive payable amount; the customer sees the calculation before transferring. If the subscription changes before approval, review fails safely and the admin must resolve the transfer with the customer instead of overwriting the newer membership.

## Payment-method policy

General settings contains independent Telegram Stars and card-to-card switches. Existing Stars defaults to enabled; the existing card-to-card state is preserved. Products inherit these settings by default. A product can opt into its own independent method selection, replacing the global defaults (including enabling a method disabled globally). Card-to-card still requires a positive Toman price and an active destination card. VIP plans and wallet packs use the global selection. Internal wallet purchases and free VIP/coupon access are unaffected.

The backend checks the effective policy inside the checkout transaction. Changes apply to new checkouts, not settlement or review of existing payments. General method settings and destination-card settings share optimistic revision control; saving cards cannot toggle the global method policy.

## Lifecycle

- Checkout snapshots price, selected destination cards, instructions, entitlement and global test mode. Idempotency is scoped to user + client request UUID.
- Production products reserve stock and create the existing delivery snapshot. No entitlement is exposed while the order is pending.
- The customer chooses the destination card and submits a transaction reference and/or JPEG/PNG receipt. One is enough. Proof is immutable after submission. Reused active transaction references and identical normalized receipt images are rejected; these are only hints, not bank verification.
- Admin must check the actual bank ledger, then approve or reject. Approval and entitlement are atomic and idempotent. API delivery uses the existing durable retry worker. Rejection requires a note and releases stock. Rejection does **not** refund a bank transfer; refunds require external handling.
- Unsubmitted checkouts expire after 24 hours and release stock. Submitted proof never expires automatically. There is a maximum of three open manual checkouts per user. Users can cancel only before submitting proof.
- Test mode uses the same review workflow but never grants a real product, wallet balance, VIP subscription, or referral reward. Never transfer real money for a test checkout. Disabling test mode also prevents approval of outstanding test payments.

## Review notifications

Approval and rejection create a private miniapp inbox entry and a durable Telegram message job in the same transaction as the decision. Messages identify the purchase and amount; rejection includes the admin's reason. Test results explicitly say that no real entitlement or balance was granted. The inbox includes a link to the relevant product, VIP, wallet, or payment history page. Its unread badge refreshes through the existing 30-second polling and foreground refresh.

Repeated reviews cannot create duplicate inbox entries or jobs. The bot worker checks every five seconds, leases jobs across workers, and retries temporary failures with backoff. Permanent Telegram errors (for example, a blocked bot) stop bot retries but leave the inbox notification available. Telegram delivery is at-least-once: a lost acknowledgement after Telegram accepts a message can cause a rare duplicate. Existing reviews are not backfilled.

Card-to-card settings includes `approval_message` and `rejection_message`, shared by both channels. Templates support `{user_name}`, `{title}`, `{amount_toman}`, `{payment_id}`, `{reason}` and `{result}`. They are plain text, max 2,000 characters; unknown/malformed placeholders are rejected and an empty template restores the default. The status heading and test warning remain automatic, and an omitted rejection reason is appended. Messages are bounded for Telegram and expanded once (never recursively). The configuration active at review time is used and snapshotted, so later edits do not change queued or delivered messages. Existing installations receive default templates without changing their saved cards or payment policy.

## Storage and security

Receipts are in the private `payment-receipts` bucket, never returned as public storage URLs. Owner/admin-authenticated endpoints stream PNG bytes with `Cache-Control: private, no-store`. Uploads accept JPEG/PNG only, max 5 MiB, max 4096 pixels per side and 12 million decoded pixels. They are decoded and re-encoded to strip metadata and active content. Do not apply public-read policies to this bucket. Include it in encrypted backups and define an operational retention policy for financial evidence. A failed object deletion may leave an unreferenced private object; reconcile orphan objects during storage maintenance.

Toman is a display/input unit. `payments.amount_minor` and card-to-card `orders.amount` persist integer Rial with `currency=IRR` (10 Rial = 1 Toman). Stars remain `XTR`; order responses include currency, amount_minor and toman. SQL lives alongside repository code in `manual_queries.go`.

## Endpoints

Telegram-authenticated:
- `GET /payment/methods?product_id=UUID` — effective product policy; omit product_id for the global default
- `GET /payment/manual/price?purpose=product|vip_plan|wallet_topup&target_id=UUID`
- `POST /payment/manual/checkout` — purpose, target_id, request_id
- `GET /payment/manual/checkouts` and `GET /payment/manual/checkouts/:id`
- `POST /payment/manual/checkouts/:id/proof` — multipart card_id, transaction_id, receipt
- `POST /payment/manual/checkouts/:id/cancel`
- `GET /payment/manual/checkouts/:id/receipt`

Admin-only:
- `GET /payment/methods/config`, `PUT /payment/methods` — telegram_stars, card_to_card, revision
- `GET|PUT /payment/manual/config` — revision-protected configuration
- `POST /payment/manual/bank` — number → validated bank metadata
- `GET /payment/manual/prices`, `PUT /payment/manual/prices/:purpose/:target_id`
- `GET /payment/manual/reviews`, `GET /payment/manual/reviews/:id`
- `POST /payment/manual/reviews/:id` — decision approve/reject, note, confirmed=true
- `GET /payment/manual/reviews/:id/receipt`

All list endpoints accept page/per_page (maximum 100). Existing Telegram authentication, admin session verification, and mandatory phone policy remain in force.

## Platform restriction

Telegram requires Stars for digital goods sold inside bots/miniapps. This method is available inside the miniapp at the owner's explicit request after acknowledging that restriction; enabling it may result in Telegram restricting the bot. See https://core.telegram.org/bots/payments-stars and https://telegram.org/tos/bot-developers.

## Verification

The miniapp content editor uses the production checkout, history and result components with synthetic payment data. Product, VIP and wallet pages offer card-to-card states via the page-state selector, including proof, submitted, approved, rejected, cancelled, test and upgrade states. Preview submissions/cancellations are local only and polling is disabled. Page sources receive no Telegram credentials in editor mode. Cards and admin-authored instructions/messages remain managed in card-to-card settings; fixed interface text is editable through the miniapp content catalog. Dialogs mount inside the editable root, below the text-editing overlay. Preview payment policies can show both methods, each method separately, or neither external method.

`go test ./...` covers unit and route guards. To run database lifecycle tests, set `COUPON_TEST_DATABASE_URL` to the local development database and run `go test ./internal/app/database -run TestManualPaymentLifecyclePostgres -count=1`. The test creates its own schema, clones empty table definitions, runs the new migrations twice, verifies transactions/concurrency/ownership/expiry/test mode, and drops only that schema. It does not modify production catalog, balances or payments.
