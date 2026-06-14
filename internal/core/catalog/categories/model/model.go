package model

import "time"

// Category represents a product category in the catalog.
type Category struct {
	ID        string    `db:"id"`
	Title     string    `db:"title"`
	Slug      string    `db:"slug"`
	StorageID string    `db:"storage_id"`
	Active    bool      `db:"active"`
	SortOrder int       `db:"sort_order"`
	CreatedAt time.Time `db:"created_at"`
}
