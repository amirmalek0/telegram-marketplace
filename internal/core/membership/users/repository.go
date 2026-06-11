package users

import (
	"context"
	"fmt"
	"telegram-marketplace/pkg/pgconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// newID generates a simple time-based unique string ID.
// Replace with a UUID library (e.g. github.com/google/uuid) for production use.
func newID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// ErrNotFound is returned when a requested user does not exist.
var ErrNotFound = fmt.Errorf("user not found")

// Repository defines the data-access contract for the users domain.
//
// Methods are grouped by concern:
//   - Writes  : Create, Update, SetBanned, Delete
//   - Single  : GetByID, GetByTelegramID
//   - Many    : List
type Repository interface {
	// --- Writes ---
	Create(ctx context.Context, u *User) error
	Update(ctx context.Context, u *User) error
	SetBanned(ctx context.Context, id string, banned bool) error
	Delete(ctx context.Context, id string) error

	// --- Single reads ---
	GetByID(ctx context.Context, id string) (*User, error)
	GetByTelegramID(ctx context.Context, telegramID int64) (*User, error)

	// --- Collection reads ---
	List(ctx context.Context, limit, offset int) ([]*User, error)
}

// postgresRepository is the Postgres implementation of Repository.
type postgresRepository struct {
	db *pgxpool.Pool
}

// NewPostgresRepository constructs a Postgres-backed Repository.
func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

// compile-time interface check
var _ Repository = (*postgresRepository)(nil)

// ============================================================
// Writes
// ============================================================

func (r *postgresRepository) Create(ctx context.Context, u *User) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO users (
			id, first_name, last_name, username, telegram_id, phone_number,
			has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
			referred_by, is_banned, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13
		)`,
		u.ID, u.FirstName, u.LastName, u.Username, u.TelegramID, u.PhoneNumber,
		u.HasActivePlan, pgconv.TextPtr(u.ActivePlanID), u.WalletBalance, pgconv.TimestamptzPtr(u.PlanExpireAt),
		pgconv.Int8Ptr(u.ReferredBy), u.IsBanned, u.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("users.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) Update(ctx context.Context, u *User) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users SET
			first_name   = $1,
			last_name    = $2,
			username     = $3,
			phone_number = $4
		WHERE id = $5`,
		u.FirstName, u.LastName, u.Username, u.PhoneNumber, u.ID,
	)
	if err != nil {
		return fmt.Errorf("users.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) SetBanned(ctx context.Context, id string, banned bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET is_banned = $1 WHERE id = $2`,
		banned, id,
	)
	if err != nil {
		return fmt.Errorf("users.repository.SetBanned: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("users.repository.Delete: %w", err)
	}
	return nil
}

// ============================================================
// Single reads
// ============================================================

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, first_name, last_name, username, telegram_id, phone_number,
		       has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
		       referred_by, is_banned, created_at
		FROM users WHERE id = $1`, id)
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByID: %w", err)
	}

	u, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[User])
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByID: %w", err)
	}
	return &u, nil
}

func (r *postgresRepository) GetByTelegramID(ctx context.Context, telegramID int64) (*User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, first_name, last_name, username, telegram_id, phone_number,
		       has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
		       referred_by, is_banned, created_at
		FROM users WHERE telegram_id = $1`, telegramID)
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByTelegramID: %w", err)
	}

	u, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[User])
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByTelegramID: %w", err)
	}
	return &u, nil
}

// ============================================================
// Collection reads
// ============================================================

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, first_name, last_name, username, telegram_id, phone_number,
		       has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
		       referred_by, is_banned, created_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("users.repository.List: %w", err)
	}

	users, err := pgx.CollectRows(rows, pgx.RowToStructByName[User])
	if err != nil {
		return nil, fmt.Errorf("users.repository.List: %w", err)
	}

	// Convert []User to []*User
	result := make([]*User, len(users))
	for i := range users {
		result[i] = &users[i]
	}
	return result, nil
}
