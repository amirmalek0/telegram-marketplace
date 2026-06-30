package model

import "time"

// Ticket status constants.
const (
	StatusOpen       = "open"
	StatusInProgress = "in_progress"
	StatusClosed     = "closed"
)

// Ticket priority constants.
const (
	PriorityLow    = "low"
	PriorityMedium = "medium"
	PriorityHigh   = "high"
	PriorityUrgent = "urgent"
)

// Ticket category constants.
const (
	CategoryGeneral   = "general"
	CategoryBilling   = "billing"
	CategoryTechnical = "technical"
	CategoryAccount   = "account"
	CategoryOther     = "other"
)

// Message sender type constants.
const (
	SenderTypeUser  = "user"
	SenderTypeAdmin = "admin"
)

// Default values for new tickets.
const (
	DefaultPriority = PriorityMedium
	DefaultCategory = CategoryGeneral
	DefaultStatus   = StatusOpen
)

// Ticket represents a support ticket in the system.
type Ticket struct {
	ID            string     `db:"id"               json:"id"`
	UserID        string     `db:"user_id"          json:"user_id"`
	Subject       string     `db:"subject"          json:"subject"`
	Status        string     `db:"status"           json:"status"`
	Priority      string     `db:"priority"         json:"priority"`
	Category      string     `db:"category"         json:"category"`
	CreatedAt     time.Time  `db:"created_at"       json:"created_at"`
	UpdatedAt     time.Time  `db:"updated_at"       json:"updated_at"`
	ClosedAt      *time.Time `db:"closed_at"        json:"closed_at,omitempty"`
	LastMessageAt time.Time  `db:"last_message_at"  json:"last_message_at"`
}

// TicketMessage represents a message within a ticket conversation.
type TicketMessage struct {
	ID         string    `db:"id"          json:"id"`
	TicketID   string    `db:"ticket_id"   json:"ticket_id"`
	SenderType string    `db:"sender_type" json:"sender_type"`
	SenderID   string    `db:"sender_id"   json:"sender_id"`
	Message    string    `db:"message"     json:"message"`
	CreatedAt  time.Time `db:"created_at"  json:"created_at"`
}
