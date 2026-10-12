package repository

const paymentColumns = `
	id, order_id, method, currency, amount_minor, checkout_reference,
	external_transaction_id, provider_transaction_id, is_test, status, provider_data,
	created_at, updated_at, paid_at, refunded_at`

const (
	queryCreatePayment = `
		INSERT INTO payments (
			order_id, method, currency, amount_minor, checkout_reference, is_test, status,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id`

	queryGetPaymentByID = `SELECT ` + paymentColumns + ` FROM payments WHERE id = $1`

	queryGetPaymentByCheckoutReference = `
		SELECT ` + paymentColumns + `
		FROM payments
		WHERE checkout_reference = $1`

	queryGetPaymentByExternalTransactionID = `
		SELECT ` + paymentColumns + `
		FROM payments
		WHERE method = $1 AND external_transaction_id = $2`

	queryListPaymentsByOrderID = `
		SELECT ` + paymentColumns + `
		FROM payments
		WHERE order_id = $1
		ORDER BY created_at DESC`

	queryListPaymentsByMethod = `
		SELECT ` + paymentColumns + `
		FROM payments
		WHERE method = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	queryCountPaymentsByMethod = `SELECT COUNT(*) FROM payments WHERE method = $1`

	queryMarkPaymentSucceeded = `
		UPDATE payments
		SET status = 'succeeded',
			external_transaction_id = $1,
			provider_transaction_id = $2,
			provider_data = $3,
			paid_at = $4,
			updated_at = $4
		WHERE id = $5 AND status = 'pending'`

	queryMarkPaymentRefunded = `
		UPDATE payments
		SET status = 'refunded', refunded_at = $1, updated_at = $1
		WHERE id = $2 AND status = 'succeeded'`
)
