package repository

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"telegram-marketplace/internal/core/commerce/payments/model"
)

type ReviewNotificationRepository interface {
	ClaimReviewNotification(context.Context) (*model.ReviewNotification, error)
	FinishReviewNotification(context.Context, string, string, string, int) error
}

func (r *postgresRepository) ClaimReviewNotification(ctx context.Context) (*model.ReviewNotification, error) {
	var n model.ReviewNotification
	err := r.db.QueryRow(ctx, queryClaimPaymentNotice).Scan(&n.ID, &n.ChatID, &n.Message, &n.Attempts, &n.LeaseToken, &n.TemplateKey, &n.Vars)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &n, err
}

func (r *postgresRepository) FinishReviewNotification(ctx context.Context, id, token, outcome string, delay int) error {
	if outcome != "sent" && outcome != "failed" && outcome != "retry" {
		return errors.New("invalid notification outcome")
	}
	tag, err := r.db.Exec(ctx, queryFinishPaymentNotice, id, token, outcome, delay)
	if err == nil && tag.RowsAffected() != 1 {
		return errors.New("notification lease no longer owned")
	}
	return err
}
