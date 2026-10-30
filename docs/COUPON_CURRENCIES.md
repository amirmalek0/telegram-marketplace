# Currency-specific coupons

Admin → Coupons: select Stars, Toman, or both. Each enabled currency has its
own fixed or percentage discount. Existing coupons default to Stars only.
Stars also covers store-wallet purchases, because wallet balances are in Stars.
Coupons remain product-only; VIP and wallet top-ups do not accept product codes.

## API

Create/update coupons accepts:

- `currency_scope`: `stars` (default), `toman`, or `both`.
- `discount_type` / `discount_value`: Stars discount (legacy fields).
- `toman_discount_type` / `toman_discount_value`: independent Toman discount.
- Each type is `static` or `percentage`; fixed discounts are whole units.

`POST /coupon/validate` accepts `code`, `product_id`, and optional `currency`
(`stars` by default, or `toman`). Toman quotes return `original_toman`,
`discount_toman`, and `payable_toman`. This is a quote, not authorization:
checkout revalidates scope, audience, product, expiry, active state and usage.

`POST /payment/manual/checkout` accepts optional `coupon_code` for products.
The server prices the order in whole Toman and persists amounts in Rial.
Changing a coupon requires a new checkout request ID; retries retain the
original amount and bank cards. Review details and order history show the
original amount, discount, final amount, and code.

## Lifecycle

Both currencies share the coupon's total usage limit. Pending orders reserve a
use; successful settlement consumes it once. Cancellation/rejection releases
the reservation. Admin approval honors the immutable checkout price even if
the coupon subsequently changes. Test payments never consume a use or grant
delivery. Percent discounts round down to whole units and cannot exceed price.

A fully discounted Toman order settles immediately without bank proof or
admin review. It is explicitly marked as coupon-settled, with zero payable
amount; normal manual payments still require proof and an admin reviewer.
Free claims do not count as paid purchases for referral rewards.
# Shared miniapp coupon input

Products use one coupon field outside the payment-method sections. Applying it
validates the same case-sensitive code for Stars (including internal-wallet
purchases) and, when available, Toman. Discounts and payable amounts stay separate
and each checkout receives only its own validated quote/code. Unsupported or
unverified currencies remain blocked while a code is entered; the user can retry
validation or remove the code to pay without it. Editing the code or changing the
product, prices, or authentication invalidates previous quotes. Coupon input is
locked while a manual checkout is in progress. No coupon field is added to VIP
or wallet top-ups, which do not currently support product coupons.
