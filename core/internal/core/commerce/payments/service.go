package payments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"

	ordersmodel "telegram-marketplace/internal/core/commerce/orders/model"
	ordersrepo "telegram-marketplace/internal/core/commerce/orders/repository"
	"telegram-marketplace/internal/core/commerce/payments/model"
	"telegram-marketplace/internal/core/commerce/payments/provider"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// ErrOrderNotFound is returned when the order does not exist.
var ErrOrderNotFound = errors.New("order not found")

// ErrOrderAlreadyPaid is returned when the order is already paid.
var ErrOrderAlreadyPaid = errors.New("order is already paid")

// ErrGatewayNotFound is returned when the payment gateway is not registered.
var ErrGatewayNotFound = errors.New("payment gateway not found")

// GatewayRegistry manages registered payment gateways.
// It provides a thread-safe way to register and retrieve payment providers.
type GatewayRegistry struct {
	mu       sync.RWMutex
	gateways map[string]provider.Provider
}

// NewGatewayRegistry creates a new empty gateway registry.
func NewGatewayRegistry() *GatewayRegistry {
	return &GatewayRegistry{
		gateways: make(map[string]provider.Provider),
	}
}

// Register adds a payment provider to the registry.
// The provider's GetGatewayName() is used as the key.
func (r *GatewayRegistry) Register(p provider.Provider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	name := p.GetGatewayName()
	r.gateways[name] = p
}

// Get retrieves a payment provider by name.
// Returns an error if the provider is not registered.
func (r *GatewayRegistry) Get(name string) (provider.Provider, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.gateways[name]
	if !ok {
		return nil, fmt.Errorf("payment gateway %q not registered", name)
	}
	return p, nil
}

// List returns all registered gateway names.
func (r *GatewayRegistry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	names := make([]string, 0, len(r.gateways))
	for name := range r.gateways {
		names = append(names, name)
	}
	return names
}

// IsRegistered checks if a gateway is registered.
func (r *GatewayRegistry) IsRegistered(name string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	_, ok := r.gateways[name]
	return ok
}

// Service holds the business logic for the payments domain.
type Service struct {
	repo      paymentsrepo.Repository
	orderRepo ordersrepo.Repository
	registry  *GatewayRegistry
}

// NewService constructs a Service with the given dependencies.
func NewService(repo paymentsrepo.Repository, orderRepo ordersrepo.Repository, registry *GatewayRegistry) *Service {
	return &Service{
		repo:      repo,
		orderRepo: orderRepo,
		registry:  registry,
	}
}

// CreatePayment initiates a payment for an order.
func (s *Service) CreatePayment(ctx context.Context, orderID, providerName, callbackURL string) (*CreatePaymentResponse, error) {
	// Get the order
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, ordersrepo.ErrNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("payments.service.CreatePayment: get order: %w", err)
	}

	// Check if order is already paid
	if order.Status == ordersmodel.StatusPaid {
		return nil, ErrOrderAlreadyPaid
	}

	// Get the payment gateway
	gateway, err := s.registry.Get(providerName)
	if err != nil {
		return nil, ErrGatewayNotFound
	}

	// Create payment with the gateway
	result, err := gateway.CreatePayment(ctx, order.Amount, orderID, fmt.Sprintf("Order %s", orderID), callbackURL)
	if err != nil {
		return nil, fmt.Errorf("payments.service.CreatePayment: gateway create: %w", err)
	}

	// Create payment record
	now := time.Now()
	payment := &model.Payment{
		OrderID:   orderID,
		Provider:  providerName,
		Amount:    order.Amount,
		Status:    model.StatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(ctx, payment); err != nil {
		return nil, fmt.Errorf("payments.service.CreatePayment: create payment: %w", err)
	}

	// Update order payment method
	if err := s.orderRepo.UpdatePaymentMethod(ctx, orderID, providerName); err != nil {
		return nil, fmt.Errorf("payments.service.CreatePayment: update order: %w", err)
	}

	return &CreatePaymentResponse{
		PaymentID:  payment.ID,
		PaymentURL: result.PaymentURL,
		Authority:  result.Authority,
		Message:    result.Message,
	}, nil
}

// VerifyPayment verifies a payment callback from the gateway.
func (s *Service) VerifyPayment(ctx context.Context, paymentID string, callbackData map[string]string) (*VerifyPaymentResponse, error) {
	// Get the payment
	payment, err := s.repo.GetByID(ctx, paymentID)
	if err != nil {
		return nil, fmt.Errorf("payments.service.VerifyPayment: get payment: %w", err)
	}

	// Get the payment gateway
	gateway, err := s.registry.Get(payment.Provider)
	if err != nil {
		return nil, ErrGatewayNotFound
	}

	// Verify with the gateway
	result, err := gateway.VerifyPayment(ctx, paymentID, callbackData)
	if err != nil {
		return nil, fmt.Errorf("payments.service.VerifyPayment: gateway verify: %w", err)
	}

	// Store callback data
	callbackJSON, _ := json.Marshal(callbackData)

	// Update payment status
	var status model.PaymentStatus
	if result.Success {
		status = model.StatusSucceeded
	} else {
		status = model.StatusFailed
	}

	gatewayTrxID := result.TrackingCode
	if err := s.repo.UpdateStatus(ctx, payment.ID, status, &gatewayTrxID, callbackJSON); err != nil {
		return nil, fmt.Errorf("payments.service.VerifyPayment: update payment: %w", err)
	}

	// Update order status if payment succeeded
	if result.Success {
		now := time.Now()
		if err := s.orderRepo.UpdateStatus(ctx, payment.OrderID, ordersmodel.StatusPaid, &now); err != nil {
			return nil, fmt.Errorf("payments.service.VerifyPayment: update order: %w", err)
		}
	} else {
		if err := s.orderRepo.UpdateStatus(ctx, payment.OrderID, ordersmodel.StatusFailed, nil); err != nil {
			return nil, fmt.Errorf("payments.service.VerifyPayment: update order: %w", err)
		}
	}

	return &VerifyPaymentResponse{
		Success:      result.Success,
		PaymentID:    payment.ID,
		Amount:       result.Amount,
		TrackingCode: result.TrackingCode,
		CardNumber:   result.CardNumber,
		Message:      result.Message,
	}, nil
}

// GetByID returns a payment by its UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Payment, error) {
	payment, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, paymentsrepo.ErrNotFound) {
			return nil, paymentsrepo.ErrNotFound
		}
		return nil, fmt.Errorf("payments.service.GetByID: %w", err)
	}
	return payment, nil
}

// ListByOrderID returns all payments for an order.
func (s *Service) ListByOrderID(ctx context.Context, orderID string) ([]*model.Payment, error) {
	payments, err := s.repo.ListByOrderID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("payments.service.ListByOrderID: %w", err)
	}
	return payments, nil
}

// ListAll returns a paginated list of all payments (admin).
func (s *Service) ListAll(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	payments, err := s.repo.ListAll(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("payments.service.ListAll: %w", err)
	}

	total, err := s.repo.CountAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("payments.service.ListAll count: %w", err)
	}

	data := make([]Response, 0, len(payments))
	for _, p := range payments {
		data = append(data, toResponse(p))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// Refund initiates a refund for a payment.
func (s *Service) Refund(ctx context.Context, paymentID string, amount *float64) (*RefundResponse, error) {
	// Get the payment
	payment, err := s.repo.GetByID(ctx, paymentID)
	if err != nil {
		return nil, fmt.Errorf("payments.service.Refund: get payment: %w", err)
	}

	// Check if payment can be refunded
	if payment.Status != model.StatusSucceeded {
		return nil, errors.New("payment cannot be refunded (not succeeded)")
	}

	// Get the payment gateway
	gateway, err := s.registry.Get(payment.Provider)
	if err != nil {
		return nil, ErrGatewayNotFound
	}

	// Determine refund amount
	refundAmount := payment.Amount
	if amount != nil && *amount > 0 {
		refundAmount = *amount
	}

	// Process refund with the gateway
	result, err := gateway.Refund(ctx, paymentID, refundAmount)
	if err != nil {
		return nil, fmt.Errorf("payments.service.Refund: gateway refund: %w", err)
	}

	// Update payment status if refund succeeded
	if result.Success {
		if err := s.repo.UpdateStatus(ctx, payment.ID, model.StatusRefunded, payment.GatewayTrxID, nil); err != nil {
			return nil, fmt.Errorf("payments.service.Refund: update payment: %w", err)
		}

		// Update order status
		if err := s.orderRepo.UpdateStatus(ctx, payment.OrderID, ordersmodel.StatusRefunded, nil); err != nil {
			return nil, fmt.Errorf("payments.service.Refund: update order: %w", err)
		}
	}

	return &RefundResponse{
		Success: result.Success,
		Message: result.Message,
	}, nil
}

// ListGateways returns all registered payment gateways.
func (s *Service) ListGateways() []string {
	return s.registry.List()
}
