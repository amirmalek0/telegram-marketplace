package repository

// SQL query constants for the inventory repository.

const (
	// queryCreateInventory inserts a new inventory and returns the generated UUID.
	queryCreateInventory = `
		INSERT INTO inventories (name, created_at)
		VALUES ($1, $2)
		RETURNING id`

	// queryGetInventoryByID retrieves an inventory by its UUID.
	queryGetInventoryByID = `
		SELECT id, name, created_at
		FROM inventories
		WHERE id = $1`

	// queryListInventories retrieves a paginated list of inventories ordered by creation date.
	queryListInventories = `
		SELECT id, name, created_at
		FROM inventories
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountInventories returns the total number of inventories.
	queryCountInventories = `SELECT COUNT(*) FROM inventories`

	// queryUpdateInventory updates the name of an inventory.
	queryUpdateInventory = `
		UPDATE inventories SET name = $1
		WHERE id = $2`

	// queryDeleteInventory removes an inventory by ID.
	queryDeleteInventory = `DELETE FROM inventories WHERE id = $1`

	// queryBulkAddItems inserts multiple inventory items in a single query.
	queryBulkAddItems = `
		INSERT INTO inventory_items (inventory_id, value, status, created_at)
		SELECT $1, unnest($2::text[]), 'available', now()`

	// queryListItems retrieves all items for a given inventory.
	queryListItems = `
		SELECT id, inventory_id, value, status, sold_at, order_id, user_id, created_at
		FROM inventory_items
		WHERE inventory_id = $1
		ORDER BY created_at ASC`

	// queryCountAvailableItems returns the number of available items in an inventory.
	queryCountAvailableItems = `
		SELECT COUNT(*) FROM inventory_items
		WHERE inventory_id = $1 AND status = 'available'`

	// queryAllocateNextItem atomically reserves the next available item for an order.
	// Uses FOR UPDATE SKIP LOCKED for concurrent safety.
	queryAllocateNextItem = `
		UPDATE inventory_items
		SET status = 'sold', sold_at = now(), order_id = $2, user_id = $3
		WHERE id = (
			SELECT id FROM inventory_items
			WHERE inventory_id = $1 AND status = 'available'
			ORDER BY created_at ASC
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		)
		RETURNING id, inventory_id, value, status, sold_at, order_id, user_id, created_at`

	// queryDeleteItem removes an inventory item by ID.
	queryDeleteItem = `DELETE FROM inventory_items WHERE id = $1`

	// queryInventoryExists checks if an inventory with the given ID exists.
	queryInventoryExists = `SELECT EXISTS(SELECT 1 FROM inventories WHERE id = $1)`
)
