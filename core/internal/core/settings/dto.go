package settings

import "time"

type GeneralResponse struct {
	RequirePhoneVerification bool `json:"require_phone_verification"`
}

type UpdateGeneralRequest struct {
	RequirePhoneVerification *bool `json:"require_phone_verification" binding:"required"`
}

type ContentResponse struct {
	Data      map[string]string `json:"data"`
	UpdatedAt *time.Time        `json:"updated_at,omitempty"`
}

type UpdateContentRequest struct {
	Value *string `json:"value" binding:"required"`
}
