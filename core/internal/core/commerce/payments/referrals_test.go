package payments

import (
	"context"
	"errors"
	repo "telegram-marketplace/internal/core/commerce/payments/repository"
	"testing"
)

type referralPaymentRepo struct {
	repo.Repository
	err error
}

func (r *referralPaymentRepo) SettleStarsPayment(context.Context, repo.SettlementInput) (*repo.SettlementResult, error) {
	if r.err != nil {
		return nil, r.err
	}
	return &repo.SettlementResult{ReferenceID: "payment"}, nil
}

type referralChecker struct {
	calls int
	tg    int64
}

func (r *referralChecker) Check(_ context.Context, tg int64) { r.calls++; r.tg = tg }
func TestReferralCheckedOnlyAfterSuccessfulSettlement(t *testing.T) {
	r := &referralPaymentRepo{}
	checker := &referralChecker{}
	s := NewService(r, nil, nil, nil)
	s.SetReferralRewards(checker)
	if _, err := s.SettleStarsPayment(context.Background(), SuccessfulPaymentInput{TelegramID: 42}); err != nil || checker.calls != 1 || checker.tg != 42 {
		t.Fatal("settled purchase not checked", err)
	}
	r.err = errors.New("invalid payment")
	if _, err := s.SettleStarsPayment(context.Background(), SuccessfulPaymentInput{TelegramID: 99}); err == nil || checker.calls != 1 {
		t.Fatal("failed payment checked")
	}
}
