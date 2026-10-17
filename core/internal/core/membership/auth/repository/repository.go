package repository

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"
)

type Sessions interface {
	Create(context.Context, string, string, string, time.Time) error
	Rotate(context.Context, string, string, string, string, time.Time) (bool, error)
	Valid(context.Context, string, string) (bool, error)
	Revoke(context.Context, string, string) error
}
type postgresSessions struct{ db *pgxpool.Pool }

func NewSessions(db *pgxpool.Pool) Sessions { return &postgresSessions{db} }
func (r *postgresSessions) Create(ctx context.Context, id, admin, refresh string, expires time.Time) error {
	if _, err := r.db.Exec(ctx, queryCleanSessions); err != nil {
		return err
	}
	_, err := r.db.Exec(ctx, queryCreateSession, id, admin, refresh, expires)
	return err
}
func (r *postgresSessions) Rotate(ctx context.Context, id, admin, old, next string, expires time.Time) (bool, error) {
	tag, err := r.db.Exec(ctx, queryRotateSession, id, admin, old, next, expires)
	return tag.RowsAffected() == 1, err
}
func (r *postgresSessions) Valid(ctx context.Context, id, admin string) (bool, error) {
	var valid bool
	err := r.db.QueryRow(ctx, queryValidSession, id, admin).Scan(&valid)
	return valid, err
}
func (r *postgresSessions) Revoke(ctx context.Context, id, admin string) error {
	_, err := r.db.Exec(ctx, queryRevokeSession, id, admin)
	return err
}
