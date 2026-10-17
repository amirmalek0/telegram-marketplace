package repository

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	telegram "telegram-marketplace/internal/platform/telegram"
)

type FailedUpdate struct {
	Update   telegram.Update
	Attempts int
}
type Queue interface {
	Enqueue(context.Context, telegram.Update) error
	Claim(context.Context) (*FailedUpdate, error)
	Done(context.Context, int64) error
	Retry(context.Context, int64, bool) error
}
type postgresQueue struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) Queue { return &postgresQueue{db} }
func (q *postgresQueue) Enqueue(ctx context.Context, u telegram.Update) error {
	data, err := json.Marshal(u)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, queryEnqueue, u.UpdateID, data)
	return err
}
func (q *postgresQueue) Claim(ctx context.Context) (*FailedUpdate, error) {
	var id int64
	var data []byte
	item := &FailedUpdate{}
	err := q.db.QueryRow(ctx, queryClaim).Scan(&id, &data, &item.Attempts)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err = json.Unmarshal(data, &item.Update); err != nil {
		return nil, err
	}
	return item, nil
}
func (q *postgresQueue) Done(ctx context.Context, id int64) error {
	_, err := q.db.Exec(ctx, queryDone, id)
	return err
}
func (q *postgresQueue) Retry(ctx context.Context, id int64, dead bool) error {
	_, err := q.db.Exec(ctx, queryRetry, id, dead)
	return err
}
