# Telegram phone sharing

General Settings → **الزام تأیید شماره تلفن** controls `require_phone_verification`.
The migration defaults this setting to `false`; deployment does not enable it.
This verifies that a user shared the phone attached to their Telegram account,
not an SMS OTP or their legal identity.

## Flow

1. The Mini App checks authenticated `GET /api/v1/user/phone-verification`.
2. If required and not verified, it does not mount the shop or other pages. A
   user action requests Telegram's native phone-sharing prompt (Mini Apps 6.9+).
   Older clients can send `/verify` in the private bot chat and use its contact button.
3. The bot receives the contact through polling or a secret-protected webhook.
   It requires a private chat, matching chat/sender/contact user IDs, a nonempty
   valid phone, and no forwarding origin. Only this trusted update writes
   `phone_number` and `phone_verified_at` atomically.
4. The Mini App polls backend status while blocked and unlocks only when the
   server confirms verification (or the admin disables the requirement).

The Mini App never posts a phone or a client-reported success flag as proof.
Existing manually entered phones remain unverified. Changing a phone through
the admin profile API clears its verification; normal signed-profile refreshes
preserve both phone and verification, including during concurrent bot updates.

## API enforcement

- Admin-only `GET/PATCH /api/v1/settings/general` reads/writes
  `{ "require_phone_verification": true | false }`. An explicit boolean is required.
- Every authenticated domain route is covered by a global guard. Unverified
  Telegram users receive HTTP 403 with `code: PHONE_VERIFICATION_REQUIRED`.
  Policy/storage errors fail closed with HTTP 503.
- Only authenticated `POST /api/v1/user` (signed identity bootstrap, returning
  only internal ID and Telegram ID) and `GET /api/v1/user/phone-verification`
  are outside that guard. Bootstrap ignores client-supplied identity/phone fields.
- Admin JWT requests retain admin access. Health, admin login/refresh, and public
  UI-copy endpoints remain available; they do not expose customer account data.
- The setting is read on each request, not cached. In-flight requests are not
  cancelled; later requests are checked. Open Stars invoices are rechecked at
  pre-checkout. Already-successful payments are still settled to avoid losing
  money or delivery records.
- Already-issued storage download URLs remain valid until their existing expiry;
  this gate does not retroactively revoke previously granted file access.

## Operations and testing

Keep the bot running so contact updates are consumed. Webhook mode requires
`TELEGRAM_WEBHOOK_SECRET`; it now refuses to start without one. Polling needs
no webhook secret. A frontend success callback alone never unlocks the app.

`go test ./...` covers all registered protected routes, enabled/disabled policy,
admin bypass, fail-closed errors, identity spoofing, contact ownership, and bot
processing. The content editor includes verification screen preview states.

For a real Telegram smoke test, enable the toggle, open the bot as an unverified
test user, cancel sharing once (access stays blocked), then share your own phone
and confirm access opens. Test the toggle off as well. Do not submit contact data
or change the production setting merely to run automated tests.

Telegram reference: https://core.telegram.org/bots/webapps#initializing-mini-apps
