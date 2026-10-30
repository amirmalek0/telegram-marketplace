package coupons

import (
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"telegram-marketplace/internal/core/commerce/coupons/model"
	"telegram-marketplace/internal/core/commerce/coupons/repository"
	"telegram-marketplace/pkg/pagination"
	"time"
)

// Service holds the business logic for the coupons domain.
type Service struct {
	repo repository.Repository
}

// NewService constructs a Service with the given repository.
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// Create stores a new coupon.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*model.Coupon, error) {
	var expiresAt *time.Time
	var err error
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			return nil, fmt.Errorf("coupons.service.Create: invalid expires_at format: %w", err)
		}
		expiresAt = &t
	}

	coupon := model.NewCoupon(
		model.NormalizeCode(req.Code),
		model.DiscountType(req.DiscountType),
		req.DiscountValue,
		req.UsageLimit,
		expiresAt,
		req.ProductIDs,
	)
	coupon.CurrencyScope = req.CurrencyScope
	if coupon.CurrencyScope == "" {
		coupon.CurrencyScope = "stars"
	}
	coupon.TomanDiscountType = model.DiscountType(req.TomanDiscountType)
	coupon.TomanDiscountValue = req.TomanDiscountValue

	if coupon.DiscountType == "" {
		coupon.DiscountType = model.DiscountTypeStatic
	}
	if coupon.TomanDiscountType == "" {
		coupon.TomanDiscountType = model.DiscountTypeStatic
	}
	if err := validateDefinition(coupon); err != nil {
		return nil, err
	}
	if coupon.ProductIDs == nil {
		coupon.ProductIDs = []string{}
	}
	coupon.UserIDs, err = s.validUserIDs(ctx, req.UserIDs)
	if err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, coupon); err != nil {
		return nil, fmt.Errorf("coupons.service.Create: %w", err)
	}

	return coupon, nil
}

// GetByID returns a coupon by its UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Coupon, error) {
	coupon, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("coupons.service.GetByID: %w", err)
	}
	return coupon, nil
}

// GetByCode returns a coupon by its code.
func (s *Service) GetByCode(ctx context.Context, code string) (*model.Coupon, error) {
	coupon, err := s.repo.GetByCode(ctx, code)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, fmt.Errorf("coupons.service.GetByCode: %w", err)
	}
	return coupon, nil
}

// List returns a paginated list of all coupons.
func (s *Service) List(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	coupons, err := s.repo.List(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("coupons.service.List: %w", err)
	}

	summary, err := s.repo.Summary(ctx)
	if err != nil {
		return nil, fmt.Errorf("coupons.service.List count: %w", err)
	}

	data := make([]Response, 0, len(coupons))
	for _, c := range coupons {
		data = append(data, toResponse(c))
	}

	return &PaginatedResponse{
		Response: pagination.NewResponse(data, summary.Total, params),
		Summary:  summary,
	}, nil
}

// Update modifies an existing coupon.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*model.Coupon, error) {
	coupon, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("coupons.service.Update: %w", err)
	}

	update := model.CouponUpdate{
		CurrencyScope: req.CurrencyScope, TomanDiscountValue: req.TomanDiscountValue,
		Code:          req.Code,
		DiscountValue: req.DiscountValue,
		UsageLimit:    req.UsageLimit,
		IsActive:      req.IsActive,
		ProductIDs:    req.ProductIDs,
	}

	if req.TomanDiscountType != nil {
		dt := model.DiscountType(*req.TomanDiscountType)
		update.TomanDiscountType = &dt
	}
	if req.DiscountType != nil {
		dt := model.DiscountType(*req.DiscountType)
		update.DiscountType = &dt
	}
	if req.UserIDs != nil {
		ids, err := s.validUserIDs(ctx, *req.UserIDs)
		if err != nil {
			return nil, err
		}
		update.UserIDs = &ids
	}

	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			return nil, fmt.Errorf("coupons.service.Update: invalid expires_at format: %w", err)
		}
		update.ExpiresAt = &t
	}

	coupon.ApplyUpdates(update)
	if req.ExpiresAt != nil && *req.ExpiresAt == "" {
		coupon.ExpiresAt = nil
	}
	coupon.Code = model.NormalizeCode(coupon.Code)
	if coupon.DiscountType == "" {
		coupon.DiscountType = model.DiscountTypeStatic
	}
	if coupon.TomanDiscountType == "" {
		coupon.TomanDiscountType = model.DiscountTypeStatic
	}
	if err := validateDefinition(coupon); err != nil {
		return nil, err
	}

	if err := s.repo.Update(ctx, coupon); err != nil {
		return nil, fmt.Errorf("coupons.service.Update: %w", err)
	}

	return coupon, nil
}

// Delete removes a coupon from the database.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("coupons.service.Delete: %w", err)
	}
	return nil
}

// Validate validates a coupon code and returns the validation result.
func (s *Service) Validate(ctx context.Context, telegramID int64, req ValidateRequest) (*ValidateResponse, error) {
	req.Code = model.NormalizeCode(req.Code)
	if req.Currency == "" {
		req.Currency = "stars"
	}
	if req.Currency != "stars" && req.Currency != "toman" {
		return nil, model.ErrCurrencyNotApplicable
	}
	if _, err := uuid.Parse(req.ProductID); err != nil {
		return nil, errors.New("شناسه محصول معتبر نیست")
	}
	coupon, err := s.repo.GetByCode(ctx, req.Code)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return &ValidateResponse{
				Valid:   false,
				Code:    req.Code,
				Message: "کد تخفیف پیدا نشد",
			}, nil
		}
		return nil, fmt.Errorf("coupons.service.Validate: %w", err)
	}

	userID, err := s.repo.UserID(ctx, telegramID)
	if err != nil {
		return nil, fmt.Errorf("coupons.service.Validate user: %w", err)
	}
	if err := coupon.Validate(req.ProductID, userID); err != nil {
		return &ValidateResponse{
			Valid:   false,
			Code:    req.Code,
			Message: err.Error(),
		}, nil
	}

	var stars int64
	if req.Currency == "toman" {
		stars, err = s.repo.ProductToman(ctx, req.ProductID)
	} else {
		stars, err = s.repo.ProductStars(ctx, req.ProductID)
	}
	if err != nil {
		return nil, fmt.Errorf("coupons.service.Validate product: %w", err)
	}
	discount, err := coupon.DiscountFor(req.Currency, stars)
	if err != nil {
		return &ValidateResponse{Valid: false, Code: req.Code, Message: err.Error()}, nil
	}
	if req.Currency == "toman" {
		return &ValidateResponse{Currency: "toman", ProductID: req.ProductID, OriginalToman: stars, DiscountToman: discount, PayableToman: stars - discount, Valid: true, Code: coupon.Code, DiscountType: string(coupon.TomanDiscountType), DiscountValue: coupon.TomanDiscountValue, ProductIDs: coupon.ProductIDs}, nil
	}
	return &ValidateResponse{
		Currency:  "stars",
		ProductID: req.ProductID, OriginalStars: stars, DiscountStars: discount, PayableStars: stars - discount,
		Valid:         true,
		Code:          coupon.Code,
		DiscountType:  string(coupon.DiscountType),
		DiscountValue: coupon.DiscountValue,
		ProductIDs:    coupon.ProductIDs,
	}, nil
}

func validateDefinition(coupon *model.Coupon) error {
	if err := coupon.ValidateDefinition(); err != nil {
		return err
	}
	for _, id := range coupon.ProductIDs {
		if _, err := uuid.Parse(id); err != nil {
			return errors.New("شناسه محصول کد تخفیف معتبر نیست")
		}
	}
	return nil
}

func (s *Service) validUserIDs(ctx context.Context, ids []string) ([]string, error) {
	result := make([]string, 0, len(ids))
	seen := make(map[string]bool, len(ids))
	for _, raw := range ids {
		id, err := uuid.Parse(raw)
		if err != nil || id == uuid.Nil {
			return nil, errors.New("شناسه کاربر کد تخفیف معتبر نیست")
		}
		canonical := id.String()
		if !seen[canonical] {
			result = append(result, canonical)
			seen[canonical] = true
		}
	}
	if len(result) > 0 {
		valid, err := s.repo.UsersExist(ctx, result)
		if err != nil {
			return nil, fmt.Errorf("coupons.service users: %w", err)
		}
		if !valid {
			return nil, errors.New("یک یا چند کاربر انتخاب‌شده وجود ندارند؛ انتخاب کاربران را بررسی کنید")
		}
	}
	return result, nil
}
