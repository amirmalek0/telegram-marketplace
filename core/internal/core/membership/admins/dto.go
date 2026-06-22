package admins

// CreateRequest represents the admin creation payload.
type CreateRequest struct {
	Username string `json:"username" binding:"required,min=3"`
	Password string `json:"password" binding:"required,min=8"`
}

// UpdateRequest represents the admin update payload.
type UpdateRequest struct {
	Username *string `json:"username"`
	Password *string `json:"password"`
	IsActive *bool   `json:"is_active"`
}
