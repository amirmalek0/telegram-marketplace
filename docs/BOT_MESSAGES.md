# Bot message customization

Admin: **پیام‌های ربات** at /bot-messages, separate from the Mini App content editor.

## Coverage

17 built-in templates cover /start, /verify/contact request and confirmation, Stars success/refund, pre-checkout phone/invalid-payment errors, inviter/invitee rewards, card-review approval/rejection, and product/VIP/wallet invoice titles/descriptions.

Up to 50 additional custom messages can form menus using “show custom message” buttons. They have no automatic trigger or new slash command. Custom callbacks cannot invoke payment status templates, settle payments, or verify a phone number. Phone verification still requires an authentic private Telegram contact belonging to the sender.

Existing broadcasts and tickets are Mini App features; this change does not silently begin broadcasting their content through Telegram. Product delivery messages remain catalog delivery data.

## Editor

- Plain text or allowlisted Telegram HTML; dynamic variables are escaped in HTML.
- Live, non-sending preview with example data.
- Buttons: link, Mini App path, copy text, custom-message menu, request phone.
- Reorder rows and buttons; 1–8 buttons per row, 10 rows, 40 buttons total.
- Telegram styles: default, primary/blue, success/green, danger/red. No arbitrary hex colors, CSS, dimensions, or blur; client rendering controls the final look.
- Contact request uses Telegram's reply keyboard, with editable label/style; it cannot be mixed with an inline keyboard in the same message.
- Pre-checkout errors and invoice fields support plain text only, without attached keyboards.
- Optional chat messages can be disabled. Contact requests, pre-checkout errors and invoice fields cannot be disabled.
- Reset built-in templates; delete custom messages with confirmation listing affected menus. Deletion also removes their linked buttons.
- Save explicitly. Preview and editing alone do not send messages or change saved configuration.

## Backend

Layered module: internal/core/botmessages (handler → service → repository/model). SQL is in repository/queries.go. Authenticated admin-only GET/PUT /api/v1/settings/bot-messages. PUT is bounded, rejects unknown JSON fields, validates placeholders/action types/URLs, and uses an optimistic revision to prevent lost updates.

The bot_message_settings row stores overrides. Existing referral and card-review texts are used until overridden by a save in this editor. Referral settings now link here. The card-review editor is explicitly for Mini App notifications; Telegram overrides live here independently.

New referral/payment outbox rows snapshot event variables (credited amount, names, payment result, rejection reason, etc.). Dispatch uses the current bot template/buttons without changing event facts. Older rows without variables keep their original rendered text. Existing durable leases/retry behavior remains intact. Disabling a message suppresses pending notifications of that type when dispatched. Already-sent Telegram messages are not edited.

Payment outcome, test-payment warning and omitted rejection reasons are appended independently of editable body text. Internal approval notes are never included. Text expansion is one-pass; user-supplied placeholder-like strings are not re-expanded. HTML is allowlisted, escaped, and truncated with balanced tags and Telegram UTF-16 limits. Buttons cannot execute backend operations or arbitrary callbacks. Mini App destinations use the bot's configured menu URL, so changing a tunnel does not require editing every button.

## Verification

Run go test ./... in core and the frontend Node test suite. Optional isolated Postgres tests use BOT_MESSAGES_TEST_DATABASE_URL (TestBotMessagesPostgres), REFERRAL_TEST_DATABASE_URL (TestReferralPostgres), and COUPON_TEST_DATABASE_URL (TestManualPaymentLifecyclePostgres). Each creates and removes only its own unique test schema; live settings and balances are untouched.
