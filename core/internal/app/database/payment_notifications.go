package database

var paymentNotificationMigrations = []string{
	`ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE`,
	`ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS source_key TEXT`,
	`ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS action_path TEXT NOT NULL DEFAULT ''`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_source ON broadcasts(source_key) WHERE source_key IS NOT NULL`,
	`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON broadcasts(recipient_user_id,published_at DESC)`,
	`CREATE TABLE IF NOT EXISTS payment_notification_outbox (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		notification_id UUID NOT NULL UNIQUE REFERENCES broadcasts(id) ON DELETE CASCADE,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		chat_id BIGINT NOT NULL, message TEXT NOT NULL,
		attempts INTEGER NOT NULL DEFAULT 0,
		next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
		lease_token UUID, lease_until TIMESTAMPTZ,
		sent_at TIMESTAMPTZ, failed_at TIMESTAMPTZ
	)`,
	`CREATE INDEX IF NOT EXISTS idx_payment_notifications_pending ON payment_notification_outbox(next_attempt_at) WHERE sent_at IS NULL AND failed_at IS NULL`,
}
