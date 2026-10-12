package repository

// SQL query constants for the products repository.

const (
	// queryCreateProduct inserts a new product and returns the generated UUID.
	queryCreateProduct = `
		INSERT INTO products (title, description, stars_price, category_id, image_storage_id, delivery_type, file_id, message_id, inventory_id, bundle_id, api_id, demo_url, vip_only, views_count, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id`

	// queryGetProductByID retrieves a product by its UUID.
	queryGetProductByID = `
		SELECT id, title, description, stars_price, category_id, image_storage_id, delivery_type, file_id, message_id, inventory_id, bundle_id, api_id, demo_url, vip_only, views_count, status, created_at
		FROM products
		WHERE id = $1`

	// queryListProducts retrieves a paginated list of products ordered by creation date.
	queryListProducts = `
		SELECT id, title, description, stars_price, category_id, image_storage_id, delivery_type, file_id, message_id, inventory_id, bundle_id, api_id, demo_url, vip_only, views_count, status, created_at
		FROM products
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountProducts returns the total number of products.
	queryCountProducts = `SELECT COUNT(*) FROM products`

	// queryUpdateProduct updates a product.
	queryUpdateProduct = `
		UPDATE products SET title = $1, description = $2, stars_price = $3, category_id = $4, image_storage_id = $5, delivery_type = $6, file_id = $7, message_id = $8, inventory_id = $9, bundle_id = $10, api_id = $11, demo_url = $12, vip_only = $13, status = $14
		WHERE id = $15`

	queryUpdateProductImage = `UPDATE products SET image_storage_id = $1 WHERE id = $2`

	// queryDeleteProduct removes a product by ID.
	queryDeleteProduct = `DELETE FROM products WHERE id = $1`

	// queryIncrementViews increments the views_count for a product.
	queryIncrementViews = `UPDATE products SET views_count = views_count + 1 WHERE id = $1`
)
