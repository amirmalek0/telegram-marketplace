package repository

// SQL query constants for the files repository.

const (
	// queryCreateFile inserts a new file record and returns the generated UUID.
	queryCreateFile = `
		INSERT INTO files (name, size, mime_type, storage_id, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	// queryGetFileByID retrieves a file by its UUID.
	queryGetFileByID = `
		SELECT id, name, size, mime_type, storage_id, created_at
		FROM files
		WHERE id = $1`

	// queryListFiles retrieves a paginated list of files ordered by creation date.
	queryListFiles = `
		SELECT id, name, size, mime_type, storage_id, created_at
		FROM files
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountFiles returns the total number of files.
	queryCountFiles = `SELECT COUNT(*) FROM files`

	// queryDeleteFile removes a file by ID.
	queryDeleteFile = `DELETE FROM files WHERE id = $1`

	// queryFileExists checks if a file with the given ID exists.
	queryFileExists = `SELECT EXISTS(SELECT 1 FROM files WHERE id = $1)`
)
