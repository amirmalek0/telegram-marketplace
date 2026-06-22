package repository

// SQL query constants for the admins repository.
// Separating queries from repository logic improves maintainability and readability.

const (
	// queryCreateAdmin inserts a new admin and returns the generated UUID.
	queryCreateAdmin = `
		INSERT INTO admins (id, username, password_hash, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)`

	// queryFindByUsername retrieves an admin by username.
	queryFindByUsername = `
		SELECT id, username, password_hash, is_active, last_login_at, created_at, updated_at
		FROM admins
		WHERE username = $1`

	// queryFindByID retrieves an admin by ID.
	queryFindByID = `
		SELECT id, username, password_hash, is_active, last_login_at, created_at, updated_at
		FROM admins
		WHERE id = $1`

	// queryListAdmins retrieves a paginated list of admins ordered by creation date.
	queryListAdmins = `
		SELECT id, username, password_hash, is_active, last_login_at, created_at, updated_at
		FROM admins
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryUpdateAdmin updates an admin's mutable fields.
	queryUpdateAdmin = `
		UPDATE admins SET
			username      = $1,
			password_hash = $2,
			is_active     = $3,
			last_login_at = $4,
			updated_at    = NOW()
		WHERE id = $5`

	// queryDeleteAdmin removes an admin by ID.
	queryDeleteAdmin = `DELETE FROM admins WHERE id = $1`

	// queryCountAdmins returns the total number of admins.
	queryCountAdmins = `SELECT COUNT(*) FROM admins`
)
