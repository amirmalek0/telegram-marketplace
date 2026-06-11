package repository

// SQL query constants for the users repository.
// Separating queries from repository logic improves maintainability and readability.

const (
	// queryCreateUser inserts a new user and returns the generated UUID.
	queryCreateUser = `
		INSERT INTO users (
			first_name, last_name, username, telegram_id, phone_number,
			has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
			referred_by, is_banned, created_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12
		)
		RETURNING id`

	// queryUpdateUser updates user profile fields.
	queryUpdateUser = `
		UPDATE users SET
			first_name   = $1,
			last_name    = $2,
			username     = $3,
			phone_number = $4
		WHERE id = $5`

	// querySetBanned updates the banned status of a user.
	querySetBanned = `UPDATE users SET is_banned = $1 WHERE id = $2`

	// queryDeleteUser removes a user by ID.
	queryDeleteUser = `DELETE FROM users WHERE id = $1`

	// queryGetUserByID retrieves a user by their UUID.
	queryGetUserByID = `
		SELECT id, first_name, last_name, username, telegram_id, phone_number,
		       has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
		       referred_by, is_banned, created_at
		FROM users WHERE id = $1`

	// queryGetUserByTelegramID retrieves a user by their Telegram ID.
	queryGetUserByTelegramID = `
		SELECT id, first_name, last_name, username, telegram_id, phone_number,
		       has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
		       referred_by, is_banned, created_at
		FROM users WHERE telegram_id = $1`

	// queryListUsers retrieves a paginated list of users ordered by creation date.
	queryListUsers = `
		SELECT id, first_name, last_name, username, telegram_id, phone_number,
		       has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
		       referred_by, is_banned, created_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`
)
