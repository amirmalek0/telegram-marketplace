package repository

// SQL query constants for the wallet transactions repository.
// Separating queries from repository logic improves maintainability and readability.

const (
	// queryCreateTransaction inserts a new wallet transaction and returns the generated UUID.
	queryCreateTransaction = `
		INSERT INTO wallet_transactions (
			user_id, type, amount, balance_before, balance_after, description, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		)
		RETURNING id`

	// queryGetTransactionByID retrieves a wallet transaction by its UUID.
	queryGetTransactionByID = `
		SELECT id, user_id, type, amount, balance_before, balance_after, description, created_at
		FROM wallet_transactions
		WHERE id = $1`

	// queryListTransactionsByUserID retrieves a paginated list of transactions for a user.
	queryListTransactionsByUserID = `
		SELECT id, user_id, type, amount, balance_before, balance_after, description, created_at
		FROM wallet_transactions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	// queryCountTransactionsByUserID returns the total number of transactions for a user.
	queryCountTransactionsByUserID = `SELECT COUNT(*) FROM wallet_transactions WHERE user_id = $1`
)
