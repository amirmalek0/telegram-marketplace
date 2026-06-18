package model

import "time"

// File represents a stored file in the catalog.
type File struct {
	ID        string    `db:"id"`
	Name      string    `db:"name"`
	Size      int64     `db:"size"`
	MimeType  string    `db:"mime_type"`
	StorageID string    `db:"storage_id"`
	CreatedAt time.Time `db:"created_at"`
}
