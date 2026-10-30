package repository

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/botmessages/model"
)

type Repository interface {
	Load(context.Context) (model.Config, map[string]string, error)
	Save(context.Context, model.Config, string) (model.Config, error)
}
type postgresRepository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) Repository { return &postgresRepository{db: db} }
func (r *postgresRepository) Load(ctx context.Context) (model.Config, map[string]string, error) {
	var c model.Config
	var raw []byte
	if err := r.db.QueryRow(ctx, queryLoad).Scan(&c.Revision, &raw); err != nil {
		return c, nil, err
	}
	if err := json.Unmarshal(raw, &c.Messages); err != nil {
		return c, nil, err
	}
	rows, err := r.db.Query(ctx, queryLegacy)
	if err != nil {
		return c, nil, err
	}
	defer rows.Close()
	legacy := map[string]string{}
	for rows.Next() {
		var key, text string
		if err = rows.Scan(&key, &text); err != nil {
			return c, nil, err
		}
		legacy[key] = text
	}
	return c, legacy, rows.Err()
}
func (r *postgresRepository) Save(ctx context.Context, c model.Config, admin string) (model.Config, error) {
	raw, err := json.Marshal(c.Messages)
	if err != nil {
		return c, err
	}
	err = r.db.QueryRow(ctx, querySave, raw, admin, c.Revision).Scan(&c.Revision)
	if errors.Is(err, pgx.ErrNoRows) {
		err = model.ErrConflict
	}
	return c, err
}
