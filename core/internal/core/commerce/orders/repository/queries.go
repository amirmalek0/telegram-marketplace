package repository

// SQL query constants for the orders repository.

const (
	queryOrdersSummary = `SELECT COUNT(*),
      COUNT(*) FILTER (WHERE o.status='pending'),
      COUNT(*) FILTER (WHERE o.status='paid'),
      COALESCE(SUM(COALESCE(p.amount_minor,GREATEST(0,o.amount-o.discount_amount)::bigint)) FILTER (WHERE o.status='paid'),0)::bigint
    FROM orders o
    LEFT JOIN LATERAL (
      SELECT amount_minor FROM payments WHERE order_id=o.id AND method IN ('telegram_stars','wallet')
      ORDER BY created_at DESC LIMIT 1
    ) p ON true`

	// queryGetOrderByID retrieves an order by its UUID.
	queryGetOrderByID = `
		SELECT o.id, o.user_id, o.product_id, o.quantity, o.coupon_id, o.coupon_code, o.amount,
		       o.discount_amount, o.payment_method, COALESCE(p.amount_minor, GREATEST(0, o.amount-o.discount_amount)::bigint) AS stars,
		       COALESCE(d.product_title, product.title, 'محصول دیجیتال') AS product_title,
		       COALESCE(d.status, '') AS delivery_status,
		       COALESCE(items.ready_count, 0)::int AS delivery_item_count,
		       o.status, o.paid_at, o.created_at, o.updated_at
		FROM orders o
		JOIN products product ON product.id = o.product_id
		LEFT JOIN LATERAL (
			SELECT amount_minor FROM payments
			WHERE order_id = o.id AND method IN ('telegram_stars','wallet')
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
		SELECT o.id, o.user_id, o.product_id, o.quantity, o.coupon_id, o.coupon_code, o.amount,
		       o.discount_amount, o.payment_method, COALESCE(p.amount_minor, GREATEST(0, o.amount-o.discount_amount)::bigint) AS stars,
		       COALESCE(d.product_title, product.title, 'محصول دیجیتال') AS product_title,
		       COALESCE(d.status, '') AS delivery_status,
		       COALESCE(items.ready_count, 0)::int AS delivery_item_count,
		       o.status, o.paid_at, o.created_at, o.updated_at
		FROM orders o
		JOIN products product ON product.id = o.product_id
		LEFT JOIN LATERAL (
			SELECT amount_minor FROM payments
			WHERE order_id = o.id AND method IN ('telegram_stars','wallet')
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
		SELECT o.id, o.user_id, o.product_id, o.quantity, o.coupon_id, o.coupon_code, o.amount,
		       o.discount_amount, o.payment_method, COALESCE(p.amount_minor, GREATEST(0, o.amount-o.discount_amount)::bigint) AS stars,
		       COALESCE(d.product_title, product.title, 'محصول دیجیتال') AS product_title,
		       COALESCE(d.status, '') AS delivery_status,
		       COALESCE(items.ready_count, 0)::int AS delivery_item_count,
		       o.status, o.paid_at, o.created_at, o.updated_at,
           CASE WHEN u.id IS NOT NULL THEN jsonb_build_object('id',u.id,'first_name',u.first_name,'last_name',u.last_name,'username',u.username,'telegram_id',u.telegram_id) END AS "user"
		FROM orders o
		LEFT JOIN products product ON product.id = o.product_id
        LEFT JOIN users u ON u.id = o.user_id
		LEFT JOIN LATERAL (
			SELECT amount_minor FROM payments
			WHERE order_id = o.id AND method IN ('telegram_stars','wallet')
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
