package repository

// SQL query constants for the products repository.

const (
	// queryCreateProduct inserts a new product and returns the generated UUID.
	queryCreateProduct = `
		INSERT INTO products (title, description, price, stars_price, category_id, image_storage_id, delivery_type, file_id, message_id, inventory_id, bundle_id, api_id, demo_url, vip_only, views_count, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		RETURNING id`

	// queryGetProductByID retrieves a product by its UUID.
	queryGetProductByID = `
		SELECT id, title, description, price, stars_price, category_id, image_storage_id, delivery_type, file_id, message_id, inventory_id, bundle_id, api_id, demo_url, vip_only, views_count, status, created_at
		FROM products
		WHERE id = $1`

	// queryListProducts retrieves a paginated list of products ordered by creation date.
	queryListProducts = `
		SELECT id, title, description, price, stars_price, category_id, image_storage_id, delivery_type, file_id, message_id, inventory_id, bundle_id, api_id, demo_url, vip_only, views_count, status, created_at
		FROM products
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountProducts returns the total number of products.
	queryCountProducts = `SELECT COUNT(*) FROM products`

	// queryUpdateProduct updates a product.
	queryUpdateProduct = `
		UPDATE products SET title = $1, description = $2, price = $3, stars_price = $4, category_id = $5, image_storage_id = $6, delivery_type = $7, file_id = $8, message_id = $9, inventory_id = $10, bundle_id = $11, api_id = $12, demo_url = $13, vip_only = $14, status = $15
		WHERE id = $16`

	queryUpdateProductImage = `UPDATE products SET image_storage_id = $1 WHERE id = $2`

	// queryDeleteProduct removes a product by ID.
	queryDeleteProduct = `DELETE FROM products WHERE id = $1`

	// queryIncrementViews increments the views_count for a product.
	queryIncrementViews = `UPDATE products SET views_count = views_count + 1 WHERE id = $1`
)
