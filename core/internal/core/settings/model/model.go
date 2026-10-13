package model

import "time"

// ContentEntry is one administrator-defined override for a Mini App text.
type ContentEntry struct {
	Key       string    `json:"key" db:"content_key"`
	Value     string    `json:"value" db:"value"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
