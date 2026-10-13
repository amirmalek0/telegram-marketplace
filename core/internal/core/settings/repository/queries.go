package repository

const (
	queryListContent = `
		SELECT content_key, value, updated_at
		FROM miniapp_content
		ORDER BY content_key`

	queryUpsertContent = `
		INSERT INTO miniapp_content (content_key, value, updated_by, updated_at)
		VALUES ($1, $2, $3, now())
		ON CONFLICT (content_key) DO UPDATE
		SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
		RETURNING content_key, value, updated_at`

	queryDeleteContent = `DELETE FROM miniapp_content WHERE content_key = $1`
)
