package repository

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/membership/users/model"
	"telegram-marketplace/pkg/pgconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

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
	Create(ctx context.Context, u *model.User) error
	Update(ctx context.Context, u *model.User) error
	SetBanned(ctx context.Context, id string, banned bool) error
	Delete(ctx context.Context, id string) error

	// --- Single reads ---
	GetByID(ctx context.Context, id string) (*model.User, error)
	GetByTelegramID(ctx context.Context, telegramID int64) (*model.User, error)

	// --- Collection reads ---
	List(ctx context.Context, limit, offset int) ([]*model.User, error)
	Count(ctx context.Context) (int64, error)
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

func (r *postgresRepository) Create(ctx context.Context, u *model.User) error {
	err := r.db.QueryRow(ctx, queryCreateUser,
		u.FirstName, u.LastName, u.Username, u.TelegramID, u.PhoneNumber,
		u.HasActivePlan, pgconv.TextPtr(u.ActivePlanID), u.WalletBalance, pgconv.TimestamptzPtr(u.PlanExpireAt),
		pgconv.Int8Ptr(u.ReferredBy), u.IsBanned, u.CreatedAt,
	).Scan(&u.ID)
	if err != nil {
		return fmt.Errorf("users.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) Update(ctx context.Context, u *model.User) error {
	_, err := r.db.Exec(ctx, queryUpdateUser,
		u.FirstName, u.LastName, u.Username, u.PhoneNumber, u.ID,
	)
	if err != nil {
		return fmt.Errorf("users.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) SetBanned(ctx context.Context, id string, banned bool) error {
	_, err := r.db.Exec(ctx, querySetBanned, banned, id)
	if err != nil {
		return fmt.Errorf("users.repository.SetBanned: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteUser, id)
	if err != nil {
		return fmt.Errorf("users.repository.Delete: %w", err)
	}
	return nil
}

// ============================================================
// Single reads
// ============================================================

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	rows, err := r.db.Query(ctx, queryGetUserByID, id)
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByID: %w", err)
	}

	u, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.User])
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByID: %w", err)
	}
	return &u, nil
}

func (r *postgresRepository) GetByTelegramID(ctx context.Context, telegramID int64) (*model.User, error) {
	rows, err := r.db.Query(ctx, queryGetUserByTelegramID, telegramID)
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByTelegramID: %w", err)
	}

	u, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.User])
	if err != nil {
		return nil, fmt.Errorf("users.repository.GetByTelegramID: %w", err)
	}
	return &u, nil
}

// ============================================================
// Collection reads
// ============================================================

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.User, error) {
	rows, err := r.db.Query(ctx, queryListUsers, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("users.repository.List: %w", err)
	}

	users, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.User])
	if err != nil {
		return nil, fmt.Errorf("users.repository.List: %w", err)
	}

	// Convert []User to []*User
	result := make([]*model.User, len(users))
	for i := range users {
		result[i] = &users[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, queryCountUsers).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("users.repository.Count: %w", err)
	}
	return total, nil
}
