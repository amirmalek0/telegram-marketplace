package model

import "time"

// TicketCategory represents a support ticket category in the system.
type TicketCategory struct {
	ID        string    `db:"id"         json:"id"`
	Name      string    `db:"name"       json:"name"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}
