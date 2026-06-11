// Package pgconv provides helper functions to convert between Go pointer types
// and pgx/pgtype nullable types. This centralizes type conversion logic for
// database operations, keeping domain models clean and database-agnostic.
package pgconv

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// Int8Ptr converts a *int64 to pgtype.Int8 for database writes.
// Returns an invalid pgtype.Int8 if the pointer is nil.
func Int8Ptr(v *int64) pgtype.Int8 {
	if v == nil {
		return pgtype.Int8{Valid: false}
	}
	return pgtype.Int8{Int64: *v, Valid: true}
}

// Int8ToPtr converts a pgtype.Int8 back to *int64 for domain models.
// Returns nil if the pgtype.Int8 is not valid (NULL).
func Int8ToPtr(v pgtype.Int8) *int64 {
	if !v.Valid {
		return nil
	}
	return &v.Int64
}

// TextPtr converts a *string to pgtype.Text for database writes.
// Returns an invalid pgtype.Text if the pointer is nil.
func TextPtr(v *string) pgtype.Text {
	if v == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *v, Valid: true}
}

// TextToPtr converts a pgtype.Text back to *string for domain models.
// Returns nil if the pgtype.Text is not valid (NULL).
func TextToPtr(v pgtype.Text) *string {
	if !v.Valid {
		return nil
	}
	return &v.String
}

// TimestamptzPtr converts a *time.Time to pgtype.Timestamptz for database writes.
// Returns an invalid pgtype.Timestamptz if the pointer is nil.
func TimestamptzPtr(v *time.Time) pgtype.Timestamptz {
	if v == nil {
		return pgtype.Timestamptz{Valid: false}
	}
	return pgtype.Timestamptz{Time: *v, Valid: true}
}

// TimestamptzToPtr converts a pgtype.Timestamptz back to *time.Time for domain models.
// Returns nil if the pgtype.Timestamptz is not valid (NULL).
func TimestamptzToPtr(v pgtype.Timestamptz) *time.Time {
	if !v.Valid {
		return nil
	}
	return &v.Time
}
