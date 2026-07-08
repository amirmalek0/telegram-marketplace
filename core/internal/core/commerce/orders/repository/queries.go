package repository

// SQL query constants for the orders repository.

const (
	// queryCreateOrder inserts a new order and returns the generated UUID.
	queryCreateOrder = `
		INSERT INTO orders (user_id, product_id, quantity, coupon_id, amount, discount_amount, payment_method, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`

	// queryGetOrderByID retrieves an order by its UUID.
	queryGetOrderByID = `
		SELECT id, user_id, product_id, quantity, coupon_id, amount, discount_amount, payment_method, status, paid_at, created_at, updated_at
		FROM orders
		WHERE id = $1`

	// queryListOrdersByUserID retrieves a paginated list of orders for a user.
	queryListOrdersByUserID = `
		SELECT id, user_id, product_id, quantity, coupon_id, amount, discount_amount, payment_method, status, paid_at, created_at, updated_at
		FROM orders
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	// queryCountOrdersByUserID returns the total number of orders for a user.
	queryCountOrdersByUserID = `SELECT COUNT(*) FROM orders WHERE user_id = $1`

	// queryListAllOrders retrieves a paginated list of all orders (admin).
	queryListAllOrders = `
		SELECT id, user_id, product_id, quantity, coupon_id, amount, discount_amount, payment_method, status, paid_at, created_at, updated_at
		FROM orders
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountAllOrders returns the total number of orders.
	queryCountAllOrders = `SELECT COUNT(*) FROM orders`

	// queryUpdateOrderStatus updates the status of an order.
	queryUpdateOrderStatus = `
		UPDATE orders SET status = $1, paid_at = $2, updated_at = $3
		WHERE id = $4`

	// queryUpdateOrderPaymentMethod updates the payment method of an order.
	queryUpdateOrderPaymentMethod = `
		UPDATE orders SET payment_method = $1, updated_at = $2
		WHERE id = $3`
)
