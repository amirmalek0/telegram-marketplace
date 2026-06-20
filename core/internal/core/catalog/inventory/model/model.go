package model

import "time"

// Inventory represents a collection of inventory items.
type Inventory struct {
	ID        string    `db:"id"`
	Name      string    `db:"name"`
	CreatedAt time.Time `db:"created_at"`
}

// InventoryItem represents a single item within an inventory.
type InventoryItem struct {
	ID          string     `db:"id"`
	InventoryID string     `db:"inventory_id"`
	Value       string     `db:"value"`
	Status      string     `db:"status"`
	SoldAt      *time.Time `db:"sold_at"`
	OrderID     *string    `db:"order_id"`
	UserID      *string    `db:"user_id"`
	CreatedAt   time.Time  `db:"created_at"`
}
