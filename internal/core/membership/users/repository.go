package users

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository defines the data-access contract for users.
type Repository interface {
	Create(ctx context.Context, u *User) error
	GetByID(ctx context.Context, id string) (*User, error)
	GetByTelegramID(ctx context.Context, telegramID int64) (*User, error)
	List(ctx context.Context, limit, offset int) ([]*User, error)
	Update(ctx context.Context, u *User) error
	SetBanned(ctx context.Context, id string, banned bool) error
	Delete(ctx context.Context, id string) error
}

// postgresRepository is the Postgres implementation of Repository.
type postgresRepository struct {
	db *pgxpool.Pool
}

// NewPostgresRepository constructs a Postgres-backed Repository.
func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) Create(ctx context.Context, u *User) error {
	query := `
		INSERT INTO users (
			id, first_name, last_name, username, telegram_id, phone_number,
			has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
			referred_by, is_banned, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13
		)`
	_, err := r.db.Exec(ctx, query,
		u.ID, u.FirstName, u.LastName, u.Username, u.TelegramID, u.PhoneNumber,
		u.HasActivePlan, u.ActivePlanID, u.WalletBalance, u.PlanExpireAt,
		u.ReferredBy, u.IsBanned, u.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("users.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*User, error) {
	query := `
		SELECT id, first_name, last_name, username, telegram_id, phone_number,
		       has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
		       referred_by, is_banned, created_at
		FROM users WHERE id = $1`

	u := &User{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.FirstName, &u.LastName, &u.Username, &u.TelegramID, &u.PhoneNumber,
		&u.HasActivePlan, &u.ActivePlanID, &u.WalletBalance, &u.PlanExpireAt,
		&u.ReferredBy, &u.IsBanned, &u.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByID: %w", err)
	}
	return u, nil
}

func (r *postgresRepository) GetByTelegramID(ctx context.Context, telegramID int64) (*User, error) {
	query := `
		SELECT id, first_name, last_name, username, telegram_id, phone_number,
		       has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
		       referred_by, is_banned, created_at
		FROM users WHERE telegram_id = $1`

	u := &User{}
	err := r.db.QueryRow(ctx, query, telegramID).Scan(
		&u.ID, &u.FirstName, &u.LastName, &u.Username, &u.TelegramID, &u.PhoneNumber,
		&u.HasActivePlan, &u.ActivePlanID, &u.WalletBalance, &u.PlanExpireAt,
		&u.ReferredBy, &u.IsBanned, &u.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByTelegramID: %w", err)
	}
	return u, nil
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*User, error) {
	query := `
		SELECT id, first_name, last_name, username, telegram_id, phone_number,
		       has_active_plan, active_plan_id, wallet_balance, plan_expire_at,
		       referred_by, is_banned, created_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("users.repository.List: %w", err)
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		u := &User{}
		if err := rows.Scan(
			&u.ID, &u.FirstName, &u.LastName, &u.Username, &u.TelegramID, &u.PhoneNumber,
			&u.HasActivePlan, &u.ActivePlanID, &u.WalletBalance, &u.PlanExpireAt,
			&u.ReferredBy, &u.IsBanned, &u.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("users.repository.List scan: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *postgresRepository) Update(ctx context.Context, u *User) error {
	query := `
		UPDATE users SET
			first_name   = $1,
			last_name    = $2,
			username     = $3,
			phone_number = $4
		WHERE id = $5`
	_, err := r.db.Exec(ctx, query, u.FirstName, u.LastName, u.Username, u.PhoneNumber, u.ID)
	if err != nil {
		return fmt.Errorf("users.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) SetBanned(ctx context.Context, id string, banned bool) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET is_banned = $1 WHERE id = $2`, banned, id)
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

// compile-time check
var _ Repository = (*postgresRepository)(nil)

// sentinel for "not found" — callers can use errors.Is
var ErrNotFound = fmt.Errorf("user not found")

// newID generates a simple time-based unique string ID.
// Replace with uuid if preferred.
func newID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
