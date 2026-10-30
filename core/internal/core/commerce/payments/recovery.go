package payments

import (
	"context"
	"log"
	"time"
)

func (s *Service) RecordRefund(ctx context.Context, reference, charge string, telegramID int64) error {
	return s.repo.RecordRefund(ctx, reference, charge, telegramID)
}
func (s *Service) PrepareRefund(ctx context.Context, reference, charge string, telegramID int64) error {
	return s.repo.PrepareRefund(ctx, reference, charge, telegramID)
}

// Delivery rows are durable jobs. Atomic claims and expiring processing leases
// allow this worker to run in multiple API instances without losing work.
func (s *Service) Run(ctx context.Context) {
	go s.runReviewNotifications(ctx)
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		s.recoverDeliveries(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
func (s *Service) recoverDeliveries(ctx context.Context) {
	if manualRepo, err := s.manualRepository(); err == nil {
		if err = manualRepo.ExpireManualPayments(ctx); err != nil {
			log.Printf("manual checkout cleanup: %v", err)
		}
	}
	if err := s.repo.ReleaseExpiredReservations(ctx); err != nil {
		log.Printf("checkout cleanup: %v", err)
	}
	ids, err := s.repo.PendingAPIDeliveries(ctx)
	if err != nil {
		log.Printf("delivery recovery: %v", err)
		return
	}
	for _, id := range ids {
		if ctx.Err() != nil {
			return
		}
		deliveryCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
		err := s.fulfillAPIDelivery(deliveryCtx, id)
		cancel()
		if err != nil {
			log.Printf("delivery %s retry failed: %v", id, err)
		}
	}
}
