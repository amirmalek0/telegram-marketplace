package repository

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"telegram-marketplace/internal/core/membership/referrals/model"
)

type NotificationRepository interface {
	ClaimNotification(context.Context) (*model.Notification, error)
	FinishNotification(context.Context, string, string, string, int) error
}

func (r *postgresRepository) ClaimNotification(ctx context.Context) (*model.Notification, error) {
	var n model.Notification
	err := r.db.QueryRow(ctx, queryClaimNotification).Scan(&n.ID, &n.ChatID, &n.Message, &n.Attempts, &n.LeaseToken, &n.Role, &n.Vars)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &n, err
}

func (r *postgresRepository) FinishNotification(ctx context.Context, id, token, outcome string, delay int) error {
	if outcome != "sent" && outcome != "failed" && outcome != "retry" {
		return errors.New("invalid notification outcome")
	}
	tag, err := r.db.Exec(ctx, queryFinishNotification, id, token, outcome, delay)
	if err == nil && tag.RowsAffected() != 1 {
		return errors.New("notification lease no longer owned")
	}
	return err
}
