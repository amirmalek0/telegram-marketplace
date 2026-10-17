package auth

// LoginRequest represents the login payload.
type LoginRequest struct {
	Username string `json:"username" binding:"required,max=128"`
	Password string `json:"password" binding:"required,max=72"`
}

// LoginResponse contains the JWT tokens after successful login.
type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"` // seconds
}

// RefreshRequest represents the token refresh payload.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}
