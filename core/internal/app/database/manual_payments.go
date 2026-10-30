package database

// Separate method-specific review state from provider-neutral settlement state.
var manualPaymentMigrations = []string{
	`ALTER TABLE products ADD COLUMN IF NOT EXISTS toman_price BIGINT NOT NULL DEFAULT 0 CHECK(toman_price BETWEEN 0 AND 1000000000)`,
	`ALTER TABLE vip_plans ADD COLUMN IF NOT EXISTS toman_price BIGINT NOT NULL DEFAULT 0 CHECK(toman_price BETWEEN 0 AND 1000000000)`,
	`ALTER TABLE wallet_topup_packs ADD COLUMN IF NOT EXISTS toman_price BIGINT NOT NULL DEFAULT 0 CHECK(toman_price BETWEEN 0 AND 1000000000)`,
	`ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'XTR'`,
	`ALTER TABLE user_vip_subscriptions DROP CONSTRAINT IF EXISTS user_vip_subscriptions_payment_method_check`,
	`ALTER TABLE user_vip_subscriptions ADD CONSTRAINT user_vip_subscriptions_payment_method_check CHECK(payment_method IN ('telegram_stars','wallet','card_to_card'))`,
	`CREATE TABLE IF NOT EXISTS manual_payment_config (
		id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),
		value JSONB NOT NULL DEFAULT '{"enabled":false,"mode":"random","fixed_card_id":"","instructions":"","cards":[]}',
		revision BIGINT NOT NULL DEFAULT 0,
		updated_by UUID REFERENCES admins(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`INSERT INTO manual_payment_config(id) VALUES(true) ON CONFLICT DO NOTHING`,
	`CREATE TABLE IF NOT EXISTS manual_payment_reviews (
		payment_id UUID PRIMARY KEY REFERENCES payments(id) ON DELETE RESTRICT,
		request_id UUID NOT NULL, user_id UUID NOT NULL REFERENCES users(id),
		title TEXT NOT NULL, cards JSONB NOT NULL, instructions TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'awaiting_proof' CHECK(status IN ('awaiting_proof','submitted','approved','rejected','cancelled')),
		transaction_id TEXT NOT NULL DEFAULT '', destination_card_id TEXT NOT NULL DEFAULT '',
		receipt_key TEXT NOT NULL DEFAULT '', receipt_hash TEXT NOT NULL DEFAULT '',
		review_note TEXT NOT NULL DEFAULT '', reviewed_by UUID REFERENCES admins(id),
		reviewed_at TIMESTAMPTZ, submitted_at TIMESTAMPTZ,
		created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
		UNIQUE(user_id,request_id),
		CHECK(status NOT IN ('submitted','approved') OR transaction_id<>'' OR receipt_key<>''),
		CHECK(status NOT IN ('approved','rejected') OR reviewed_by IS NOT NULL)
	)`,
	`CREATE INDEX IF NOT EXISTS idx_manual_reviews_queue ON manual_payment_reviews(status,created_at DESC)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_reviews_transaction ON manual_payment_reviews(transaction_id) WHERE transaction_id<>'' AND status IN ('submitted','approved')`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_reviews_receipt ON manual_payment_reviews(receipt_hash) WHERE receipt_hash<>'' AND status IN ('submitted','approved')`,
}
