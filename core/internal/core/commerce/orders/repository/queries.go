package repository

// SQL query constants for the orders repository.

const (
	// queryGetOrderByID retrieves an order by its UUID.
	queryGetOrderByID = `
		SELECT o.id, o.user_id, o.product_id, o.quantity, o.coupon_id, o.amount,
		       o.discount_amount, o.payment_method, COALESCE(p.amount_minor, 0) AS stars,
		       COALESCE(d.product_title, product.title, 'محصول دیجیتال') AS product_title,
		       COALESCE(d.status, '') AS delivery_status,
		       COALESCE(items.ready_count, 0)::int AS delivery_item_count,
		       o.status, o.paid_at, o.created_at, o.updated_at
		FROM orders o
		JOIN products product ON product.id = o.product_id
		LEFT JOIN LATERAL (
			SELECT amount_minor FROM payments
			WHERE order_id = o.id AND method = 'telegram_stars'
			ORDER BY created_at DESC LIMIT 1
		) p ON true
		LEFT JOIN order_deliveries d ON d.order_id = o.id
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS ready_count FROM order_delivery_items
			WHERE delivery_id = d.id AND status = 'ready'
		) items ON true
		WHERE o.id = $1`

	// queryListOrdersByUserID retrieves a paginated list of orders for a user.
	queryListOrdersByUserID = `
		SELECT o.id, o.user_id, o.product_id, o.quantity, o.coupon_id, o.amount,
		       o.discount_amount, o.payment_method, COALESCE(p.amount_minor, 0) AS stars,
		       COALESCE(d.product_title, product.title, 'محصول دیجیتال') AS product_title,
		       COALESCE(d.status, '') AS delivery_status,
		       COALESCE(items.ready_count, 0)::int AS delivery_item_count,
		       o.status, o.paid_at, o.created_at, o.updated_at
		FROM orders o
		JOIN products product ON product.id = o.product_id
		LEFT JOIN LATERAL (
			SELECT amount_minor FROM payments
			WHERE order_id = o.id AND method = 'telegram_stars'
			ORDER BY created_at DESC LIMIT 1
		) p ON true
		LEFT JOIN order_deliveries d ON d.order_id = o.id
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS ready_count FROM order_delivery_items
			WHERE delivery_id = d.id AND status = 'ready'
		) items ON true
		WHERE o.user_id = $1
		ORDER BY o.created_at DESC
		LIMIT $2 OFFSET $3`

	// queryCountOrdersByUserID returns the total number of orders for a user.
	queryCountOrdersByUserID = `SELECT COUNT(*) FROM orders WHERE user_id = $1`

	// queryListAllOrders retrieves a paginated list of all orders (admin).
	queryListAllOrders = `
		SELECT o.id, o.user_id, o.product_id, o.quantity, o.coupon_id, o.amount,
		       o.discount_amount, o.payment_method, COALESCE(p.amount_minor, 0) AS stars,
		       COALESCE(d.product_title, product.title, 'محصول دیجیتال') AS product_title,
		       COALESCE(d.status, '') AS delivery_status,
		       COALESCE(items.ready_count, 0)::int AS delivery_item_count,
		       o.status, o.paid_at, o.created_at, o.updated_at
		FROM orders o
		JOIN products product ON product.id = o.product_id
		LEFT JOIN LATERAL (
			SELECT amount_minor FROM payments
			WHERE order_id = o.id AND method = 'telegram_stars'
			ORDER BY created_at DESC LIMIT 1
		) p ON true
		LEFT JOIN order_deliveries d ON d.order_id = o.id
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS ready_count FROM order_delivery_items
			WHERE delivery_id = d.id AND status = 'ready'
		) items ON true
		ORDER BY o.created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountAllOrders returns the total number of orders.
	queryCountAllOrders = `SELECT COUNT(*) FROM orders`
)
