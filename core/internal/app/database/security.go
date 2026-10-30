package database

var securityMigrations = []string{
	`CREATE TABLE IF NOT EXISTS payment_refunds (
	charge_id TEXT PRIMARY KEY,checkout_reference TEXT NOT NULL,telegram_id BIGINT NOT NULL,
	completed_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
	`CREATE TABLE IF NOT EXISTS telegram_failed_updates (
	update_id BIGINT PRIMARY KEY,payload JSONB NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,
	next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),dead_letter BOOLEAN NOT NULL DEFAULT false)`,
	`CREATE INDEX IF NOT EXISTS idx_telegram_failed_updates_due ON telegram_failed_updates(next_attempt_at) WHERE NOT dead_letter`,
	`CREATE TABLE IF NOT EXISTS admin_sessions (
 id UUID PRIMARY KEY,admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
 refresh_id UUID NOT NULL,expires_at TIMESTAMPTZ NOT NULL)`,
	`CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at)`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS precheckout_accepted_at TIMESTAMPTZ`,
	`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_minor_check`,
	`ALTER TABLE payments ADD CONSTRAINT payments_amount_minor_check CHECK (amount_minor>0 OR (amount_minor=0 AND (is_test OR (method='card_to_card' AND currency='IRR' AND COALESCE(checkout_data->>'coupon_code','')<>''))))`,
}
