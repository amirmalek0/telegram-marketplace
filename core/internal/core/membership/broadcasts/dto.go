package broadcasts

import (
	"telegram-marketplace/internal/core/membership/broadcasts/model"
	"telegram-marketplace/pkg/pagination"
)

type PublishRequest struct {
	Title     string `json:"title" binding:"required,max=120"`
	Message   string `json:"message" binding:"required,max=4000"`
	RequestID string `json:"request_id" binding:"required,uuid"`
}

type InboxResponse struct {
	pagination.Response[model.Notification]
	UnreadCount int64 `json:"unread_count"`
}
