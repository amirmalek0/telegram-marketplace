package repository

// SQL query constants for the messages repository.

const (
	// queryCreateMessage inserts a new delivery message and returns the generated UUID.
	queryCreateMessage = `
		INSERT INTO delivery_messages (content, created_at)
		VALUES ($1, $2)
		RETURNING id`

	// queryGetMessageByID retrieves a delivery message by its UUID.
	queryGetMessageByID = `
		SELECT id, content, created_at
		FROM delivery_messages
		WHERE id = $1`

	// queryListMessages retrieves a paginated list of delivery messages ordered by creation date.
	queryListMessages = `
		SELECT id, content, created_at
		FROM delivery_messages
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountMessages returns the total number of delivery messages.
	queryCountMessages = `SELECT COUNT(*) FROM delivery_messages`

	// queryUpdateMessage updates the content of a delivery message.
	queryUpdateMessage = `
		UPDATE delivery_messages SET content = $1
		WHERE id = $2`

	// queryDeleteMessage removes a delivery message by ID.
	queryDeleteMessage = `DELETE FROM delivery_messages WHERE id = $1`

	// queryMessageExists checks if a delivery message with the given ID exists.
	queryMessageExists = `SELECT EXISTS(SELECT 1 FROM delivery_messages WHERE id = $1)`
)
