package repository

// SQL query constants for the categories repository.

const (
	// queryCreateCategory inserts a new category and returns the generated UUID.
	queryCreateCategory = `
		INSERT INTO categories (title, storage_id, active, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	// queryGetCategoryByID retrieves a category by its UUID.
	queryGetCategoryByID = `
		SELECT id, title, storage_id, active, sort_order, created_at
		FROM categories
		WHERE id = $1`

	// queryListCategories retrieves a paginated list of categories ordered by sort_order.
	queryListCategories = `
		SELECT id, title, storage_id, active, sort_order, created_at
		FROM categories
		ORDER BY sort_order ASC, created_at ASC
		LIMIT $1 OFFSET $2`

	// queryCountCategories returns the total number of categories.
	queryCountCategories = `SELECT COUNT(*) FROM categories`

	// queryUpdateCategory updates the mutable profile fields of a category.
	queryUpdateCategory = `
		UPDATE categories SET
			title      = $1,
			active     = $2,
			sort_order = $3
		WHERE id = $4`

	// queryUpdateStorageID stores the object-storage key for the category icon.
	queryUpdateStorageID = `UPDATE categories SET storage_id = $1 WHERE id = $2`

	// queryBulkUpdateSortOrder performs a single UPDATE for multiple rows using
	// unnest to expand the id and sort_order arrays in parallel.
	queryBulkUpdateSortOrder = `
		UPDATE categories SET sort_order = v.sort_order
		FROM (
			SELECT unnest($1::uuid[]) AS id,
			       unnest($2::int[])  AS sort_order
		) AS v
		WHERE categories.id = v.id`

	// queryDeleteCategory removes a category by ID.
	queryDeleteCategory = `DELETE FROM categories WHERE id = $1`
)
