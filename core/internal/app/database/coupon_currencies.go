package database

var couponCurrencyMigrations = []string{
	`ALTER TABLE manual_payment_reviews ADD COLUMN IF NOT EXISTS coupon_settled BOOLEAN NOT NULL DEFAULT false CHECK(NOT coupon_settled OR status='approved')`,
	`DO $$ BEGIN
 ALTER TABLE manual_payment_reviews DROP CONSTRAINT IF EXISTS manual_payment_reviews_check;
 ALTER TABLE manual_payment_reviews DROP CONSTRAINT IF EXISTS manual_payment_reviews_check1;
 ALTER TABLE manual_payment_reviews ADD CONSTRAINT manual_payment_reviews_check CHECK(coupon_settled OR status NOT IN ('submitted','approved') OR transaction_id<>'' OR receipt_key<>'');
 ALTER TABLE manual_payment_reviews ADD CONSTRAINT manual_payment_reviews_check1 CHECK(coupon_settled OR status NOT IN ('approved','rejected') OR reviewed_by IS NOT NULL);
 END $$`,
	// A fully discounted manual checkout is settled immediately without a transfer.
	`DO $$ BEGIN
 ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_minor_check;
 ALTER TABLE payments ADD CONSTRAINT payments_amount_minor_check CHECK (
 amount_minor > 0 OR (amount_minor = 0 AND (is_test OR (method='card_to_card' AND currency='IRR'
 AND COALESCE(checkout_data->>'coupon_code','') <> ''))));
 END $$`,
	`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS currency_scope TEXT NOT NULL DEFAULT 'stars' CHECK (currency_scope IN ('stars','toman','both'))`,
	`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS toman_discount_type TEXT NOT NULL DEFAULT 'static' CHECK (toman_discount_type IN ('static','percentage'))`,
	`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS toman_discount_value DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (toman_discount_value >= 0)`,
	`DO $$ BEGIN
 ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_discount_value_check;
 ALTER TABLE coupons ADD CONSTRAINT coupons_discount_value_check CHECK(discount_value>=0 AND (currency_scope='toman' OR discount_value>0));
 END $$`,
}
