package payments

import (
	"context"
	"errors"
	repo "telegram-marketplace/internal/core/commerce/payments/repository"
	"testing"
)

type deliveryRecoveryRepo struct {
	repo.Repository
	failed, complete int
	ready            bool
}

func (r *deliveryRecoveryRepo) ReleaseExpiredReservations(context.Context) error { return nil }
func (r *deliveryRecoveryRepo) PendingAPIDeliveries(context.Context) ([]string, error) {
	return []string{"delivery"}, nil
}
func (r *deliveryRecoveryRepo) ListPendingAPIDeliveryItems(context.Context, string) ([]repo.APIDeliveryItem, error) {
	return []repo.APIDeliveryItem{{ID: "item", APIID: "api"}}, nil
}
func (r *deliveryRecoveryRepo) ClaimAPIDeliveryItem(context.Context, string) (bool, error) {
	return !r.ready, nil
}
func (r *deliveryRecoveryRepo) FailAPIDeliveryItem(context.Context, string, string, string) error {
	r.failed++
	return nil
}
func (r *deliveryRecoveryRepo) CompleteAPIDeliveryItem(context.Context, string, string) error {
	r.ready = true
	return nil
}
func (r *deliveryRecoveryRepo) CompleteAPIDelivery(context.Context, string) error {
	if r.ready {
		r.complete++
	}
	return nil
}

type retryExecutor struct {
	calls int
	key   string
}

func (e *retryExecutor) ExecuteAPICallIdempotent(_ context.Context, api, key string) (string, error) {
	e.calls++
	e.key = key
	if e.calls == 1 {
		return "", errors.New("transient provider outage")
	}
	return "delivery", nil
}
func TestWorkerRecoversFailedDeliveryWithStableKey(t *testing.T) {
	r := &deliveryRecoveryRepo{}
	executor := &retryExecutor{}
	s := NewService(r, nil, executor, nil)
	s.recoverDeliveries(context.Background())
	if r.failed != 1 || r.complete != 0 {
		t.Fatal("failure not persisted")
	}
	s.recoverDeliveries(context.Background())
	if executor.calls != 2 || executor.key != "item" || r.complete != 1 {
		t.Fatal("delivery not recovered")
	}
}

type simulationConfigRepo struct{ repo.Repository }

func (simulationConfigRepo) GetPaymentConfig(context.Context, string) (*repo.PaymentConfig, error) {
	return &repo.PaymentConfig{TestMode: false}, nil
}
func TestDisabledSimulationRejectedBeforeLookingUpInvoice(t *testing.T) {
	s := NewService(simulationConfigRepo{}, nil, nil, nil)
	if _, err := s.SimulateStarsPayment(context.Background(), 42, "old-test", "succeeded"); !errors.Is(err, ErrInvalidCheckout) {
		t.Fatal(err)
	}
}
