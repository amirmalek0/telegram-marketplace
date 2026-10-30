package referrals

import (
	"context"
	"errors"
	"log"
	"time"

	"telegram-marketplace/internal/core/membership/referrals/repository"
	"telegram-marketplace/internal/platform/telegram"
)

type notificationSender interface {
	SendMessage(context.Context, int64, string) error
}

type templatedSender interface {
	SendNotification(context.Context, int64, string, string, map[string]string) error
}

func (s *Service) SetNotificationSender(sender notificationSender) { s.notificationSender = sender }

// Only the bot worker dispatches committed credits. No Telegram call is made
// while a wallet transaction is open. Multiple workers claim exclusive leases.
func (s *Service) DispatchNotifications(ctx context.Context) error {
	repo, ok := s.repo.(repository.NotificationRepository)
	sender, hasSender := s.bot.(notificationSender)
	if s.notificationSender != nil {
		sender = s.notificationSender
		hasSender = true
	}
	if !ok || !hasSender {
		return nil
	}
	for i := 0; i < 20; i++ {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		n, err := repo.ClaimNotification(ctx)
		if err != nil || n == nil {
			return err
		}
		sendCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		var sendErr error
		if rich, ok := sender.(templatedSender); ok {
			sendErr = rich.SendNotification(sendCtx, n.ChatID, "referral."+n.Role, n.Message, n.Vars)
		} else {
			sendErr = sender.SendMessage(sendCtx, n.ChatID, n.Message)
		}
		cancel()
		outcome, delay := "sent", 0
		if sendErr != nil {
			outcome = "retry"
			delay = 60 * (1 << min(max(n.Attempts-1, 0), 6))
			if delay > 3600 {
				delay = 3600
			}
			var apiErr *telegram.APIError
			if errors.As(sendErr, &apiErr) && (apiErr.Code == 400 || apiErr.Code == 403) {
				outcome = "failed"
			}
			// Do not log raw transport errors: they may contain the bot token in a URL.
			log.Printf("referral notification %s: %s", n.ID, outcome)
		}
		// Record delivery even when shutdown cancels the parent after Telegram responds.
		ackCtx, ackCancel := context.WithTimeout(context.Background(), 5*time.Second)
		err = repo.FinishNotification(ackCtx, n.ID, n.LeaseToken, outcome, delay)
		ackCancel()
		if err != nil {
			return err
		}
	}
	return nil
}
