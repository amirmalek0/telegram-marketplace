package model

import "time"

// DeliveryMessage represents text content for product delivery.
type DeliveryMessage struct {
	ID        string    `db:"id"`
	Content   string    `db:"content"`
	CreatedAt time.Time `db:"created_at"`
}
