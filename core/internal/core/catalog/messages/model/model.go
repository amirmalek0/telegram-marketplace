package model

import "time"

// DeliveryMessage represents text content for product delivery.
type DeliveryMessage struct {
	ID        string    `db:"id"`
	Name      string    `db:"name"`
	Content   string    `db:"content"`
	CreatedAt time.Time `db:"created_at"`
}
