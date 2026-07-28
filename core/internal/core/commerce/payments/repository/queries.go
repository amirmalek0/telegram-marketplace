package repository

// SQL query constants for the payments repository.

const (
	// queryCreatePayment inserts a new payment and returns the generated UUID.
	queryCreatePayment = `
		INSERT INTO payments (order_id, provider, gateway_trx_id, amount, status, callback_data, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id`

	// queryGetPaymentByID retrieves a payment by its UUID.
	queryGetPaymentByID = `
		SELECT id, order_id, provider, gateway_trx_id, amount, status, callback_data, created_at, updated_at
		FROM payments
		WHERE id = $1`

	// queryGetPaymentByGatewayTrxID retrieves a payment by its gateway transaction ID.
	queryGetPaymentByGatewayTrxID = `
		SELECT id, order_id, provider, gateway_trx_id, amount, status, callback_data, created_at, updated_at
		FROM payments
		WHERE gateway_trx_id = $1 AND provider = $2`

	// queryListPaymentsByOrderID retrieves all payments for an order.
	queryListPaymentsByOrderID = `
		SELECT id, order_id, provider, gateway_trx_id, amount, status, callback_data, created_at, updated_at
		FROM payments
		WHERE order_id = $1
		ORDER BY created_at DESC`

	// queryListAllPayments retrieves a paginated list of all payments (admin).
	queryListAllPayments = `
		SELECT id, order_id, provider, gateway_trx_id, amount, status, callback_data, created_at, updated_at
		FROM payments
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountAllPayments returns the total number of payments.
	queryCountAllPayments = `SELECT COUNT(*) FROM payments`

	// queryUpdatePaymentStatus updates the status of a payment.
	queryUpdatePaymentStatus = `
		UPDATE payments SET status = $1, gateway_trx_id = $2, callback_data = $3, updated_at = $4
		WHERE id = $5`

	// queryUpdatePaymentCallbackData updates the callback data of a payment.
	queryUpdatePaymentCallbackData = `
		UPDATE payments SET callback_data = $1, updated_at = $2
		WHERE id = $3`
)
