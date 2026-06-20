package model

import "time"

// Bundle represents a composite delivery configuration combining file, message, and/or inventory.
type Bundle struct {
	ID          string    `db:"id"`
	Name        string    `db:"name"`
	FileID      *string   `db:"file_id"`
	MessageID   *string   `db:"message_id"`
	InventoryID *string   `db:"inventory_id"`
	CreatedAt   time.Time `db:"created_at"`
}
