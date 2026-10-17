package model

import "time"

type Photo struct {
	ID          string
	UserID      string
	UniqueID    string
	StorageKey  string
	ContentType string
	Width       int
	Height      int
	Position    int
	SavedAt     time.Time
	Current     bool
}
type Job struct {
	UserID     string
	TelegramID int64
	Offset     int
}
type State struct {
	Status       string     `json:"status"`
	LastSyncedAt *time.Time `json:"last_synced_at"`
	Error        string     `json:"error"`
}
