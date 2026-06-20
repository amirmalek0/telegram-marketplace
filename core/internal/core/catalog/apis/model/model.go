package model

import "time"

// Header represents a key-value header for an API call.
type Header struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// API represents an external API call configuration for product delivery.
type API struct {
	ID           string    `db:"id"`
	Name         string    `db:"name"`
	URL          string    `db:"url"`
	Method       string    `db:"method"`
	Body         *string   `db:"body"`
	ResponsePath *string   `db:"response_path"`
	Headers      []Header  `db:"headers"`
	CreatedAt    time.Time `db:"created_at"`
}
