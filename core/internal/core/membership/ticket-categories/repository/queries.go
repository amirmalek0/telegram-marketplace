package repository

// SQL query constants for the ticket_categories repository.

const (
	// queryCreateTicketCategory inserts a new ticket category and returns the generated UUID.
	queryCreateTicketCategory = `
		INSERT INTO ticket_categories (name, created_at)
		VALUES ($1, $2)
		RETURNING id`

	// queryGetTicketCategoryByID retrieves a ticket category by its UUID.
	queryGetTicketCategoryByID = `
		SELECT id, name, created_at
		FROM ticket_categories
		WHERE id = $1`

	// queryGetTicketCategoryByName retrieves a ticket category by its name.
	queryGetTicketCategoryByName = `
		SELECT id, name, created_at
		FROM ticket_categories
		WHERE name = $1`

	// queryListTicketCategories retrieves a paginated list of ticket categories ordered by created_at.
	queryListTicketCategories = `
		SELECT id, name, created_at
		FROM ticket_categories
		ORDER BY created_at ASC
		LIMIT $1 OFFSET $2`

	// queryCountTicketCategories returns the total number of ticket categories.
	queryCountTicketCategories = `SELECT COUNT(*) FROM ticket_categories`

	// queryUpdateTicketCategory updates the mutable fields of a ticket category.
	queryUpdateTicketCategory = `
		UPDATE ticket_categories SET
			name = $1
		WHERE id = $2`

	// queryDeleteTicketCategory removes a ticket category by ID.
	queryDeleteTicketCategory = `DELETE FROM ticket_categories WHERE id = $1`
)
