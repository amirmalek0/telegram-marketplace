package repository

// SQL query constants for the tickets repository.
// Separating queries from repository logic improves maintainability and readability.

const (
	// queryCreateTicket inserts a new ticket and returns the generated UUID.
	queryCreateTicket = `
		INSERT INTO tickets (
			user_id, subject, status, priority, category,
			created_at, updated_at, last_message_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
		RETURNING id`

	// queryUpdateTicket updates ticket fields.
	queryUpdateTicket = `
		UPDATE tickets SET
			subject      = $1,
			status       = $2,
			priority     = $3,
			category     = $4,
			updated_at   = $5,
			closed_at    = $6
		WHERE id = $7`

	// queryCloseTicket closes a ticket and sets the closed_at timestamp.
	queryCloseTicket = `
		UPDATE tickets SET
			status     = 'closed',
			closed_at  = $1,
			updated_at = $2
		WHERE id = $3`

	// queryReopenTicket reopens a closed ticket.
	queryReopenTicket = `
		UPDATE tickets SET
			status     = 'open',
			closed_at  = NULL,
			updated_at = $1
		WHERE id = $2`

	// queryUpdateLastMessageAt updates the last_message_at timestamp.
	queryUpdateLastMessageAt = `
		UPDATE tickets SET
			last_message_at = $1,
			updated_at      = $2
		WHERE id = $3`

	// queryDeleteTicket removes a ticket by ID.
	queryDeleteTicket = `DELETE FROM tickets WHERE id = $1`

	// queryGetTicketByID retrieves a ticket by its UUID.
	queryGetTicketByID = `
		SELECT id, user_id, subject, status, priority, category,
		       created_at, updated_at, closed_at, last_message_at
		FROM tickets WHERE id = $1`

	// queryListTicketsByUser retrieves tickets for a specific user.
	queryListTicketsByUser = `
		SELECT id, user_id, subject, status, priority, category,
		       created_at, updated_at, closed_at, last_message_at
		FROM tickets
		WHERE user_id = $1
		ORDER BY last_message_at DESC
		LIMIT $2 OFFSET $3`

	// queryCountTicketsByUser returns the total number of tickets for a user.
	queryCountTicketsByUser = `SELECT COUNT(*) FROM tickets WHERE user_id = $1`

	// queryListAllTickets retrieves all tickets with optional filters.
	queryListAllTickets = `
		SELECT id, user_id, subject, status, priority, category,
		       created_at, updated_at, closed_at, last_message_at
		FROM tickets
		WHERE ($1::text IS NULL OR status = $1)
		  AND ($2::text IS NULL OR priority = $2)
		  AND ($3::text IS NULL OR category = $3)
		ORDER BY last_message_at DESC
		LIMIT $4 OFFSET $5`

	// queryCountAllTickets returns the total number of tickets with optional filters.
	queryCountAllTickets = `
		SELECT COUNT(*) FROM tickets
		WHERE ($1::text IS NULL OR status = $1)
		  AND ($2::text IS NULL OR priority = $2)
		  AND ($3::text IS NULL OR category = $3)`

	// queryCreateMessage inserts a new ticket message.
	queryCreateMessage = `
		INSERT INTO ticket_messages (
			ticket_id, sender_type, sender_id, message, created_at
		) VALUES (
			$1, $2, $3, $4, $5
		)
		RETURNING id`

	// queryListMessagesByTicket retrieves all messages for a ticket.
	queryListMessagesByTicket = `
		SELECT id, ticket_id, sender_type, sender_id, message, created_at
		FROM ticket_messages
		WHERE ticket_id = $1
		ORDER BY created_at ASC`

	// queryGetLatestMessage retrieves the most recent message for a ticket.
	queryGetLatestMessage = `
		SELECT id, ticket_id, sender_type, sender_id, message, created_at
		FROM ticket_messages
		WHERE ticket_id = $1
		ORDER BY created_at DESC
		LIMIT 1`
)
