package database

// Text widget instances are stored in the existing per-page layout documents.
// Replace the old global 4,000-character constraint atomically; ordinary copy
// entries retain that limit. Safe to rerun on every API/bot startup.
var miniappWidgetMigrations = []string{
	`DO $$ BEGIN
		ALTER TABLE miniapp_content DROP CONSTRAINT IF EXISTS miniapp_content_value_length;
		ALTER TABLE miniapp_content ADD CONSTRAINT miniapp_content_value_length CHECK (
			octet_length(value) <= 262144 AND
			(content_key LIKE 'appearance.page.%' OR content_key LIKE 'appearance.widget.%' OR char_length(value) <= 4000)
		);
	END $$`,
}
