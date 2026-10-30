package payments

import (
	"context"
	"errors"
	"log"
	"telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/internal/platform/telegram"
	"time"
)

type ReviewNotificationSender interface {
	SendMessage(context.Context, int64, string) error
}

func (s *Service) SetReviewNotificationSender(sender ReviewNotificationSender) {
	s.notificationSender = sender
}

func (s *Service) runReviewNotifications(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		if err := s.DispatchReviewNotifications(ctx); err != nil && ctx.Err() == nil {
			log.Print("payment notification dispatch failed; will retry")
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// Durable queue entries are committed with approval/rejection. Telegram is
// contacted only afterwards; network failures never roll back a paid order.
func (s *Service) DispatchReviewNotifications(ctx context.Context) error {
	r, ok := s.repo.(repository.ReviewNotificationRepository)
	if !ok || s.notificationSender == nil {
		return nil
	}
	for i := 0; i < 20; i++ {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		n, err := r.ClaimReviewNotification(ctx)
		if err != nil || n == nil {
			return err
		}
		sendCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		var sendErr error
		if rich, ok := s.notificationSender.(interface {
			SendNotification(context.Context, int64, string, string, map[string]string) error
		}); ok {
			sendErr = rich.SendNotification(sendCtx, n.ChatID, n.TemplateKey, n.Message, n.Vars)
		} else {
			sendErr = s.notificationSender.SendMessage(sendCtx, n.ChatID, n.Message)
		}
		cancel()
		outcome, delay := "sent", 0
		if sendErr != nil {
			outcome, delay = "retry", min(3600, 60*(1<<min(max(n.Attempts-1, 0), 6)))
			var apiErr *telegram.APIError
			if errors.As(sendErr, &apiErr) && (apiErr.Code == 400 || apiErr.Code == 403) {
				outcome = "failed"
			}
			// Transport errors may contain the bot token. Never log their text.
			log.Printf("payment notification %s: %s", n.ID, outcome)
		}
		ackCtx, ackCancel := context.WithTimeout(context.Background(), 5*time.Second)
		err = r.FinishReviewNotification(ackCtx, n.ID, n.LeaseToken, outcome, delay)
		ackCancel()
		if err != nil {
			return err
		}
	}
	return nil
}
