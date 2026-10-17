package userphotos

import (
	"telegram-marketplace/internal/core/membership/userphotos/model"
	"time"
)

type PhotoResponse struct {
	ID      string    `json:"id"`
	URL     string    `json:"url"`
	Width   int       `json:"width"`
	Height  int       `json:"height"`
	SavedAt time.Time `json:"saved_at"`
	Current bool      `json:"current"`
}
type Gallery struct {
	Photos []PhotoResponse `json:"photos"`
	Total  int64           `json:"total"`
	Sync   model.State     `json:"sync"`
}
