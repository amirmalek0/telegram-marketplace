package repository

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	couponmodel "telegram-marketplace/internal/core/commerce/coupons/model"
)

type CouponError struct{ Message string }

func (e *CouponError) Error() string { return e.Message }

type productPrice struct {
	Original, Discount, Payable int64
	CouponID                    *string
	Code                        string
}

// The coupon row remains locked until the order is committed. Pending orders
// reserve uses; only a successfully settled order increments usage_count.
func priceProduct(ctx context.Context, tx pgx.Tx, product *CheckoutProduct, code, userID string) (productPrice, error) {
	price := productPrice{Original: product.StarsPrice, Payable: product.StarsPrice}
	code = couponmodel.NormalizeCode(code)
	if code == "" {
		return price, nil
	}
	rows, err := tx.Query(ctx, queryLockCheckoutCoupon, code)
	if err != nil {
		return price, err
	}
	coupon, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[couponmodel.Coupon])
	if errors.Is(err, pgx.ErrNoRows) {
		return price, &CouponError{"کد تخفیف پیدا نشد"}
	}
	if err != nil {
		return price, err
	}
	if err := coupon.Validate(product.ID, userID); err != nil {
		return price, &CouponError{err.Error()}
	}
	var pending int64
	if err := tx.QueryRow(ctx, queryPendingCouponUsage, coupon.ID).Scan(&pending); err != nil {
		return price, err
	}
	if coupon.UsageLimit > 0 && int64(coupon.UsageCount)+pending >= int64(coupon.UsageLimit) {
		return price, &CouponError{"ظرفیت این کد تخفیف تمام شده یا در انتظار پرداخت است"}
	}
	discount, err := coupon.DiscountStars(product.StarsPrice)
	if err != nil {
		return price, &CouponError{err.Error()}
	}
	price.CouponID, price.Code = &coupon.ID, coupon.Code
	price.Discount, price.Payable = discount, product.StarsPrice-discount
	return price, nil
}
