package repository

// SQL query constants for the products repository.

const (
	// queryCreateProduct inserts a new product and returns the generated UUID.
	queryCreateProduct = `
		INSERT INTO products (title, description, price, category_id, delivery_type, file_id, message_id, inventory_id, bundle_id, api_id, demo_url, vip_only, views_count, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id`

	// queryGetProductByID retrieves a product by its UUID.
	queryGetProductByID = `
		SELECT id, title, description, price, category_id, delivery_type, file_id, message_id, inventory_id, bundle_id, api_id, demo_url, vip_only, views_count, status, created_at
		FROM products
		WHERE id = $1`

	// queryListProducts retrieves a paginated list of products ordered by creation date.
	queryListProducts = `
		SELECT id, title, description, price, category_id, delivery_type, file_id, message_id, inventory_id, bundle_id, api_id, demo_url, vip_only, views_count, status, created_at
		FROM products
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountProducts returns the total number of products.
	queryCountProducts = `SELECT COUNT(*) FROM products`

	// queryUpdateProduct updates a product.
	queryUpdateProduct = `
		UPDATE products SET title = $1, description = $2, price = $3, category_id = $4, delivery_type = $5, file_id = $6, message_id = $7, inventory_id = $8, bundle_id = $9, api_id = $10, demo_url = $11, vip_only = $12, status = $13
		WHERE id = $14`

	// queryDeleteProduct removes a product by ID.
	queryDeleteProduct = `DELETE FROM products WHERE id = $1`

	// queryIncrementViews increments the views_count for a product.
	queryIncrementViews = `UPDATE products SET views_count = views_count + 1 WHERE id = $1`
)
