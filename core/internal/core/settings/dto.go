package settings

import "time"

type ContentResponse struct {
	Data      map[string]string `json:"data"`
	UpdatedAt *time.Time        `json:"updated_at,omitempty"`
}

type UpdateContentRequest struct {
	Value *string `json:"value" binding:"required,max=4000"`
}
