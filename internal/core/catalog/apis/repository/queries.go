package repository

// SQL query constants for the apis repository.

const (
	// queryCreateAPI inserts a new API configuration and returns the generated UUID.
	queryCreateAPI = `
		INSERT INTO apis (url, method, body, response_path, headers, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	// queryGetAPIByID retrieves an API by its UUID.
	queryGetAPIByID = `
		SELECT id, url, method, body, response_path, headers, created_at
		FROM apis
		WHERE id = $1`

	// queryListAPIs retrieves a paginated list of APIs ordered by creation date.
	queryListAPIs = `
		SELECT id, url, method, body, response_path, headers, created_at
		FROM apis
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountAPIs returns the total number of APIs.
	queryCountAPIs = `SELECT COUNT(*) FROM apis`

	// queryUpdateAPI updates an API configuration.
	queryUpdateAPI = `
		UPDATE apis SET url = $1, method = $2, body = $3, response_path = $4, headers = $5
		WHERE id = $6`

	// queryDeleteAPI removes an API by ID.
	queryDeleteAPI = `DELETE FROM apis WHERE id = $1`

	// queryAPIExists checks if an API with the given ID exists.
	queryAPIExists = `SELECT EXISTS(SELECT 1 FROM apis WHERE id = $1)`
)
