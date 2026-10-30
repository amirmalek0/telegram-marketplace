# Miniapp checkout presentation

Admin path: Payments → Payment Settings (`/payments/checkout-settings`).

Global Stars and card-to-card activation toggles live together at the top of this
page. They save separately from presentation settings. General Settings no longer
contains method toggles; destination cards, instructions, and customer messages
remain in Payments → Card-to-card.

Each purpose (`product`, `vip_plan`, `wallet_topup`) has an independent mode:

- `stars_first` (default): Stars price and checkout first, card-to-card below.
- `toman_first`: Toman price and card-to-card first, Stars below.
- `both`: both prices followed by an expandable payment-method chooser.

This is presentation only. It never enables a provider, changes a price, converts
currencies, or bypasses checkout authorization. Product overrides still apply.
Card availability is read from the existing manual-price endpoint (including
active destination cards and a positive price). If only one provider is usable,
the UI falls back to that provider. Internal wallet purchases and VIP access are
preserved. Wallet pack Stars describe the credit received, even when paid in Toman.

The configuration is persisted as validated JSON at `appearance.checkout` through
the existing admin-only miniapp-content service/repository. No migration is needed.
Unknown/missing frontend values fall back to Stars-first. Backend saves require
all three purpose keys and valid modes. Other content settings are unaffected.

Miniapp content is refreshed on opening and window focus. The editor has safe
preview scenarios for all three modes, using synthetic manual-payment prices;
previewing never creates a payment. Real quotes and payment validation remain
server-authoritative. VIP upgrade calculations still appear in the chosen
provider's existing checkout flow.
