package database

var botMessageMigrations = []string{
	`CREATE TABLE IF NOT EXISTS bot_message_settings (
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),
 revision BIGINT NOT NULL DEFAULT 0,
 messages JSONB NOT NULL DEFAULT '[]'::jsonb,
 updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`,
	`INSERT INTO bot_message_settings(id) VALUES(true) ON CONFLICT DO NOTHING`,
	`ALTER TABLE referral_notifications ADD COLUMN IF NOT EXISTS template_vars JSONB NOT NULL DEFAULT '{}'::jsonb`,
	`ALTER TABLE payment_notification_outbox ADD COLUMN IF NOT EXISTS template_key TEXT NOT NULL DEFAULT ''`,
	`ALTER TABLE payment_notification_outbox ADD COLUMN IF NOT EXISTS template_vars JSONB NOT NULL DEFAULT '{}'::jsonb`,
}
