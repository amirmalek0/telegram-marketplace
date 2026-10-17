package database

var userPhotoMigrations = []string{
	`CREATE TABLE IF NOT EXISTS user_profile_photos (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 telegram_unique_id TEXT NOT NULL, storage_key TEXT NOT NULL UNIQUE,
 content_type TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
 sort_order INTEGER NOT NULL, saved_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,telegram_unique_id))`,
	`CREATE INDEX IF NOT EXISTS idx_user_profile_photos_user ON user_profile_photos(user_id,sort_order,saved_at DESC)`,
	`CREATE TABLE IF NOT EXISTS user_photo_sync (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending', next_offset INTEGER NOT NULL DEFAULT 0,
 next_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_attempt_at TIMESTAMPTZ,
 last_synced_at TIMESTAMPTZ, locked_until TIMESTAMPTZ, error TEXT NOT NULL DEFAULT '')`,
	`CREATE INDEX IF NOT EXISTS idx_user_photo_sync_due ON user_photo_sync(next_at)`,
	`CREATE TABLE IF NOT EXISTS user_photo_deletions (storage_key TEXT PRIMARY KEY)`,
	`CREATE OR REPLACE FUNCTION queue_user_photo_deletion() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN INSERT INTO user_photo_deletions(storage_key) VALUES(OLD.storage_key) ON CONFLICT DO NOTHING; RETURN OLD; END $$`,
	`CREATE OR REPLACE TRIGGER user_photo_deleted AFTER DELETE ON user_profile_photos FOR EACH ROW EXECUTE FUNCTION queue_user_photo_deletion()`,
}
