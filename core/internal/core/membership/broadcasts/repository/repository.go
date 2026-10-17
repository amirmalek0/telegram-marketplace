package repository

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/membership/broadcasts/model"
	"time"
)

var ErrNotFound = errors.New("notification not found")
var ErrUserUnavailable = errors.New("notification user unavailable")
var ErrPublishConflict = errors.New("publish request was already used for another message")

type Repository interface {
	Publish(context.Context, string, string, string, string) (*model.Broadcast, error)
	List(context.Context, int, int) ([]model.Broadcast, int64, error)
	Archive(context.Context, string) error
	Inbox(context.Context, int64, int, int) ([]model.Notification, int64, int64, error)
	Unread(context.Context, int64) (int64, error)
	MarkRead(context.Context, int64, string) (*time.Time, error)
	MarkAllRead(context.Context, int64) error
}

type postgresRepository struct{ db *pgxpool.Pool }

func NewPostgresRepository(db *pgxpool.Pool) Repository { return &postgresRepository{db: db} }

func (r *postgresRepository) Publish(ctx context.Context, title, message, adminID, requestID string) (*model.Broadcast, error) {
	rows, err := r.db.Query(ctx, queryPublish, title, message, adminID, requestID)
	if err != nil {
		return nil, err
	}
	item, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Broadcast])
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrPublishConflict
	}
	return &item, err
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]model.Broadcast, int64, error) {
	rows, err := r.db.Query(ctx, queryAdminList, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Broadcast])
	if err != nil {
		return nil, 0, err
	}
	var total int64
	err = r.db.QueryRow(ctx, queryAdminCount).Scan(&total)
	return items, total, err
}

func (r *postgresRepository) Archive(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, queryArchive, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresRepository) userID(ctx context.Context, telegramID int64) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, queryUser, telegramID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrUserUnavailable
	}
	return id, err
}

func (r *postgresRepository) Inbox(ctx context.Context, telegramID int64, limit, offset int) ([]model.Notification, int64, int64, error) {
	id, err := r.userID(ctx, telegramID)
	if err != nil {
		return nil, 0, 0, err
	}
	rows, err := r.db.Query(ctx, queryInbox, id, limit, offset)
	if err != nil {
		return nil, 0, 0, err
	}
	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Notification])
	if err != nil {
		return nil, 0, 0, err
	}
	var total, unread int64
	err = r.db.QueryRow(ctx, queryInboxCounts, id).Scan(&total, &unread)
	return items, total, unread, err
}

func (r *postgresRepository) Unread(ctx context.Context, telegramID int64) (int64, error) {
	id, err := r.userID(ctx, telegramID)
	if err != nil {
		return 0, err
	}
	var total, unread int64
	err = r.db.QueryRow(ctx, queryInboxCounts, id).Scan(&total, &unread)
	return unread, err
}

func (r *postgresRepository) MarkRead(ctx context.Context, telegramID int64, broadcastID string) (*time.Time, error) {
	id, err := r.userID(ctx, telegramID)
	if err != nil {
		return nil, err
	}
	var readAt time.Time
	err = r.db.QueryRow(ctx, queryRead, broadcastID, id).Scan(&readAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &readAt, err
}

func (r *postgresRepository) MarkAllRead(ctx context.Context, telegramID int64) error {
	id, err := r.userID(ctx, telegramID)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, queryReadAll, id)
	return err
}
