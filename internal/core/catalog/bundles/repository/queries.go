package repository

// SQL query constants for the bundles repository.

const (
	// queryCreateBundle inserts a new bundle and returns the generated UUID.
	queryCreateBundle = `
		INSERT INTO bundles (file_id, message_id, inventory_id, created_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id`

	// queryGetBundleByID retrieves a bundle by its UUID.
	queryGetBundleByID = `
		SELECT id, file_id, message_id, inventory_id, created_at
		FROM bundles
		WHERE id = $1`

	// queryListBundles retrieves a paginated list of bundles ordered by creation date.
	queryListBundles = `
		SELECT id, file_id, message_id, inventory_id, created_at
		FROM bundles
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountBundles returns the total number of bundles.
	queryCountBundles = `SELECT COUNT(*) FROM bundles`

	// queryUpdateBundle updates a bundle configuration.
	queryUpdateBundle = `
		UPDATE bundles SET file_id = $1, message_id = $2, inventory_id = $3
		WHERE id = $4`

	// queryDeleteBundle removes a bundle by ID.
	queryDeleteBundle = `DELETE FROM bundles WHERE id = $1`

	// queryBundleExists checks if a bundle with the given ID exists.
	queryBundleExists = `SELECT EXISTS(SELECT 1 FROM bundles WHERE id = $1)`

	// queryIsFileReferenced checks if a file_id is referenced by any bundle.
	queryIsFileReferenced = `SELECT EXISTS(SELECT 1 FROM bundles WHERE file_id = $1)`

	// queryIsMessageReferenced checks if a message_id is referenced by any bundle.
	queryIsMessageReferenced = `SELECT EXISTS(SELECT 1 FROM bundles WHERE message_id = $1)`

	// queryIsInventoryReferenced checks if an inventory_id is referenced by any bundle.
	queryIsInventoryReferenced = `SELECT EXISTS(SELECT 1 FROM bundles WHERE inventory_id = $1)`
)
