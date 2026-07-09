package orders

import (
	"context"
	"errors"
	"fmt"
	productsmodel "telegram-marketplace/internal/core/catalog/products/model"
	productsrepo "telegram-marketplace/internal/core/catalog/products/repository"
	couponsrepo "telegram-marketplace/internal/core/commerce/coupons/repository"
	"telegram-marketplace/internal/core/commerce/orders/model"
	"telegram-marketplace/internal/core/commerce/orders/repository"
	usersrepo "telegram-marketplace/internal/core/membership/users/repository"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// ErrProductNotFound is returned when the product does not exist.
var ErrProductNotFound = errors.New("product not found")

// ErrCouponInvalid is returned when the coupon is invalid or expired.
var ErrCouponInvalid = errors.New("coupon is invalid or expired")

// ErrUserNotFound is returned when the user does not exist.
var ErrUserNotFound = errors.New("user not found")

// Service holds the business logic for the orders domain.
type Service struct {
	repo        repository.Repository
	productRepo productsrepo.Repository
	couponRepo  couponsrepo.Repository
	userRepo    usersrepo.Repository
}

// NewService constructs a Service with the given repositories.
func NewService(repo repository.Repository, productRepo productsrepo.Repository, couponRepo couponsrepo.Repository, userRepo usersrepo.Repository) *Service {
	return &Service{
		repo:        repo,
		productRepo: productRepo,
		couponRepo:  couponRepo,
		userRepo:    userRepo,
	}
}

// getUserIDByTelegramID looks up a user by their Telegram ID and returns their UUID.
func (s *Service) getUserIDByTelegramID(ctx context.Context, telegramID int64) (string, error) {
	user, err := s.userRepo.GetByTelegramID(ctx, telegramID)
	if err != nil {
		if errors.Is(err, usersrepo.ErrNotFound) {
			return "", ErrUserNotFound
		}
		return "", fmt.Errorf("orders.service.getUserIDByTelegramID: %w", err)
	}
	return user.ID, nil
}

// Create stores a new order after validating the product and applying any coupon discount.
func (s *Service) Create(ctx context.Context, telegramID int64, req CreateRequest) (*model.Order, error) {
	userID, err := s.getUserIDByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, err
	}

	product, err := s.validateProduct(ctx, req.ProductID)
	if err != nil {
		return nil, err
	}

	totalAmount := product.Price * float64(req.Quantity)

	discountAmount, couponID, err := s.applyCoupon(ctx, req.CouponID, totalAmount)
	if err != nil {
		return nil, err
	}

	order := model.NewOrder(userID, req.ProductID, req.Quantity, couponID, totalAmount-discountAmount, discountAmount)

	if err := s.repo.Create(ctx, order); err != nil {
		return nil, fmt.Errorf("orders.service.Create: %w", err)
	}

	return order, nil
}

// validateProduct checks if a product exists and returns it.
func (s *Service) validateProduct(ctx context.Context, productID string) (*productsmodel.Product, error) {
	product, err := s.productRepo.GetByID(ctx, productID)
	if err != nil {
		if errors.Is(err, productsrepo.ErrNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, fmt.Errorf("orders.service.validateProduct: %w", err)
	}
	return product, nil
}

// applyCoupon validates and applies a coupon discount if a coupon ID is provided.
// Returns the discount amount, coupon ID (if applied), and any error.
func (s *Service) applyCoupon(ctx context.Context, couponID *string, totalAmount float64) (float64, *string, error) {
	if couponID == nil {
		return 0.0, nil, nil
	}

	coupon, err := s.couponRepo.GetByID(ctx, *couponID)
	if err != nil {
		if errors.Is(err, couponsrepo.ErrNotFound) {
			return 0.0, nil, ErrCouponInvalid
		}
		return 0.0, nil, fmt.Errorf("orders.service.applyCoupon: get coupon: %w", err)
	}

	if err := coupon.Validate(""); err != nil {
		return 0.0, nil, ErrCouponInvalid
	}

	discountAmount := coupon.CalculateDiscount(totalAmount)

	if err := s.couponRepo.IncrementUsage(ctx, coupon.ID); err != nil {
		return 0.0, nil, fmt.Errorf("orders.service.applyCoupon: increment usage: %w", err)
	}

	return discountAmount, couponID, nil
}

// GetByID returns an order by its UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Order, error) {
	order, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("orders.service.GetByID: %w", err)
	}

	return order, nil
}

// ListByTelegramID returns a paginated list of orders for a telegram user.
func (s *Service) ListByTelegramID(ctx context.Context, telegramID int64, params pagination.Params) (*PaginatedResponse, error) {
	// Look up user by telegram ID
	userID, err := s.getUserIDByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, err
	}

	orders, err := s.repo.ListByUserID(ctx, userID, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("orders.service.ListByTelegramID: %w", err)
	}

	total, err := s.repo.CountByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("orders.service.ListByTelegramID count: %w", err)
	}

	data := make([]Response, 0, len(orders))
	for _, o := range orders {
		data = append(data, toResponse(o))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// ListAll returns a paginated list of all orders (admin).
func (s *Service) ListAll(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	orders, err := s.repo.ListAll(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("orders.service.ListAll: %w", err)
	}

	total, err := s.repo.CountAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("orders.service.ListAll count: %w", err)
	}

	data := make([]Response, 0, len(orders))
	for _, o := range orders {
		data = append(data, toResponse(o))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// UpdateStatus updates the status of an order.
func (s *Service) UpdateStatus(ctx context.Context, id string, status model.OrderStatus) error {
	var paidAt *time.Time
	if status == model.StatusPaid {
		now := time.Now()
		paidAt = &now
	}

	if err := s.repo.UpdateStatus(ctx, id, status, paidAt); err != nil {
		return fmt.Errorf("orders.service.UpdateStatus: %w", err)
	}
	return nil
}

// UpdatePaymentMethod updates the payment method of an order.
func (s *Service) UpdatePaymentMethod(ctx context.Context, id string, paymentMethod string) error {
	if err := s.repo.UpdatePaymentMethod(ctx, id, paymentMethod); err != nil {
		return fmt.Errorf("orders.service.UpdatePaymentMethod: %w", err)
	}
	return nil
}
