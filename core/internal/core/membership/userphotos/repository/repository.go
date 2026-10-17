package repository

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/membership/userphotos/model"
)

type Repository interface {
	Seed(context.Context) error
	Schedule(context.Context, string) error
	ScheduleVisit(context.Context, string) error
	Request(context.Context, string) error
	Claim(context.Context) (model.Job, error)
	Existing(context.Context, string, string) (model.Photo, error)
	Get(context.Context, string, string) (model.Photo, error)
	Save(context.Context, model.Photo) error
	Current(context.Context, string, string) error
	Finish(context.Context, string, string, int, string) error
	List(context.Context, string, int, int) ([]model.Photo, int64, error)
	State(context.Context, string) (model.State, error)
	Owner(context.Context, string) (int64, error)
	Deletions(context.Context) ([]string, error)
	Deleted(context.Context, string) error
}
type postgres struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) Repository              { return &postgres{db} }
func (r *postgres) Seed(ctx context.Context) error { _, err := r.db.Exec(ctx, seedSQL); return err }
func (r *postgres) Schedule(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, scheduleSQL, id)
	return err
}
func (r *postgres) ScheduleVisit(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, scheduleVisitSQL, id)
	return err
}
func (r *postgres) Request(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, requestSQL, id)
	return err
}
func (r *postgres) Claim(ctx context.Context) (j model.Job, err error) {
	err = r.db.QueryRow(ctx, claimSQL).Scan(&j.UserID, &j.TelegramID, &j.Offset)
	return
}

type scanner interface{ Scan(...any) error }

func scan(row scanner) (p model.Photo, err error) {
	err = row.Scan(&p.ID, &p.UserID, &p.UniqueID, &p.StorageKey, &p.ContentType, &p.Width, &p.Height, &p.Position, &p.SavedAt)
	return
}
func (r *postgres) Existing(ctx context.Context, id, unique string) (model.Photo, error) {
	return scan(r.db.QueryRow(ctx, existingSQL, id, unique))
}
func (r *postgres) Get(ctx context.Context, id, photoID string) (model.Photo, error) {
	return scan(r.db.QueryRow(ctx, getSQL, id, photoID))
}
func (r *postgres) Save(ctx context.Context, p model.Photo) error {
	_, err := r.db.Exec(ctx, saveSQL, p.ID, p.UserID, p.UniqueID, p.StorageKey, p.ContentType, p.Width, p.Height, p.Position)
	return err
}
func (r *postgres) Current(ctx context.Context, id, url string) error {
	_, err := r.db.Exec(ctx, currentSQL, id, url)
	return err
}
func (r *postgres) Finish(ctx context.Context, id, status string, offset int, message string) error {
	_, err := r.db.Exec(ctx, finishSQL, id, status, offset, message)
	return err
}
func (r *postgres) List(ctx context.Context, id string, limit, offset int) ([]model.Photo, int64, error) {
	rows, err := r.db.Query(ctx, listSQL, id, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	result := []model.Photo{}
	for rows.Next() {
		var p model.Photo
		if err = rows.Scan(&p.ID, &p.UserID, &p.UniqueID, &p.StorageKey, &p.ContentType, &p.Width, &p.Height, &p.Position, &p.SavedAt, &p.Current); err != nil {
			return nil, 0, err
		}
		result = append(result, p)
	}
	if err = rows.Err(); err != nil {
		return nil, 0, err
	}
	var total int64
	err = r.db.QueryRow(ctx, countSQL, id).Scan(&total)
	return result, total, err
}
func (r *postgres) State(ctx context.Context, id string) (s model.State, err error) {
	err = r.db.QueryRow(ctx, stateSQL, id).Scan(&s.Status, &s.LastSyncedAt, &s.Error)
	return
}
func (r *postgres) Owner(ctx context.Context, id string) (n int64, err error) {
	err = r.db.QueryRow(ctx, ownerSQL, id).Scan(&n)
	return
}
func (r *postgres) Deletions(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx, deletionsSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := []string{}
	for rows.Next() {
		var key string
		if err = rows.Scan(&key); err != nil {
			return nil, err
		}
		keys = append(keys, key)
	}
	return keys, rows.Err()
}
func (r *postgres) Deleted(ctx context.Context, key string) error {
	_, err := r.db.Exec(ctx, deletedSQL, key)
	return err
}
