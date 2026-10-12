package model

import "time"

// PlanStatus represents the status of a VIP plan.
type PlanStatus string

// Plan status constants.
const (
	StatusActive   PlanStatus = "active"
	StatusInactive PlanStatus = "inactive"
)

// ValidPlanStatuses returns all valid plan statuses.
func ValidPlanStatuses() []PlanStatus {
	return []PlanStatus{
		StatusActive,
		StatusInactive,
	}
}

// IsValid checks if the plan status is valid.
func (s PlanStatus) IsValid() bool {
	for _, valid := range ValidPlanStatuses() {
		if s == valid {
			return true
		}
	}
	return false
}

// Plan represents a VIP plan in the system.
type Plan struct {
	ID         string     `db:"id"         json:"id"`
	Title      string     `db:"title"      json:"title"`
	StarsPrice int64      `db:"stars_price" json:"stars_price"`
	Duration   int        `db:"duration"   json:"duration"`
	Status     PlanStatus `db:"status"     json:"status"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
}
