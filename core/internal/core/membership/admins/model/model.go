package model

import "time"

// Admin represents a backoffice administrator.
type Admin struct {
	ID           string     `db:"id"            json:"id"`
	Username     string     `db:"username"      json:"username"`
	PasswordHash string     `db:"password_hash" json:"-"` // never expose in JSON
	IsActive     bool       `db:"is_active"     json:"is_active"`
	LastLoginAt  *time.Time `db:"last_login_at" json:"last_login_at"`
	CreatedAt    time.Time  `db:"created_at"    json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at"    json:"updated_at"`
}
