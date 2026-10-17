package handler

import (
	"context"
	"log"
	telegram "telegram-marketplace/internal/platform/telegram"
	"time"
)

func (h *Handler) handleUpdate(ctx context.Context, u telegram.Update) error {
	financial := u.Message != nil && u.Message.SuccessfulPayment != nil
	// Persist financial evidence before any side effect, not just after failure.
	if financial && h.queue != nil {
		if err := h.queue.Enqueue(ctx, u); err != nil {
			return err
		}
	}
	if err := h.processUpdate(ctx, u); err != nil {
		if h.queue == nil {
			return err
		}
		log.Printf("telegram update %d queued for retry", u.UpdateID)
		return h.queue.Enqueue(ctx, u)
	}
	if financial && h.queue != nil {
		return h.queue.Done(ctx, u.UpdateID)
	}
	return nil
}

func (h *Handler) retryFailedUpdates(ctx context.Context) {
	if h.queue == nil {
		return
	}
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		item, err := h.queue.Claim(ctx)
		if err != nil {
			log.Printf("bot recovery unavailable: %v", err)
		}
		if item != nil {
			runCtx, cancel := context.WithTimeout(ctx, 75*time.Second)
			err = h.processUpdate(runCtx, item.Update)
			cancel()
			if err == nil {
				err = h.queue.Done(ctx, item.Update.UpdateID)
			} else {
				// Financial updates never run out of retries. Other poison updates remain
				// durably available for inspection without blocking incoming traffic.
				financial := item.Update.Message != nil && item.Update.Message.SuccessfulPayment != nil
				log.Printf("bot recovery update %d attempt %d failed", item.Update.UpdateID, item.Attempts)
				err = h.queue.Retry(ctx, item.Update.UpdateID, !financial && item.Attempts >= 10)
			}
			if err != nil {
				log.Printf("bot recovery persistence: %v", err)
			}
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
