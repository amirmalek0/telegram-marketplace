package model

import "time"

type Broadcast struct {
	ID          string     `db:"id" json:"id"`
	Title       string     `db:"title" json:"title"`
	Message     string     `db:"message" json:"message"`
	PublishedAt time.Time  `db:"published_at" json:"published_at"`
	ArchivedAt  *time.Time `db:"archived_at" json:"archived_at,omitempty"`
	ReadCount   int64      `db:"read_count" json:"read_count"`
}

type Notification struct {
	ActionPath  string     `db:"action_path" json:"action_path,omitempty"`
	ID          string     `db:"id" json:"id"`
	Title       string     `db:"title" json:"title"`
	Message     string     `db:"message" json:"message"`
	PublishedAt time.Time  `db:"published_at" json:"published_at"`
	ReadAt      *time.Time `db:"read_at" json:"read_at,omitempty"`
}
