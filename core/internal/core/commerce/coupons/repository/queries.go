package repository

// SQL query constants for the coupons repository.

const (
	// queryCreateCoupon inserts a new coupon and returns the generated UUID.
	queryCreateCoupon = `
		INSERT INTO coupons (code, discount_type, discount_value, usage_limit, usage_count, expires_at, is_active, product_ids, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`

	// queryGetCouponByID retrieves a coupon by its UUID.
	queryGetCouponByID = `
		SELECT id, code, discount_type, discount_value, usage_limit, usage_count, expires_at, is_active, product_ids, created_at, updated_at
		FROM coupons
		WHERE id = $1`

	// queryGetCouponByCode retrieves a coupon by its code.
	queryGetCouponByCode = `
		SELECT id, code, discount_type, discount_value, usage_limit, usage_count, expires_at, is_active, product_ids, created_at, updated_at
		FROM coupons
		WHERE code = $1`

	// queryListCoupons retrieves a paginated list of all coupons.
	queryListCoupons = `
		SELECT id, code, discount_type, discount_value, usage_limit, usage_count, expires_at, is_active, product_ids, created_at, updated_at
		FROM coupons
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountCoupons returns the total number of coupons.
	queryCountCoupons = `SELECT COUNT(*) FROM coupons`

	// queryUpdateCoupon updates a coupon.
	queryUpdateCoupon = `
		UPDATE coupons SET code = $1, discount_type = $2, discount_value = $3, usage_limit = $4, expires_at = $5, is_active = $6, product_ids = $7, updated_at = $8
		WHERE id = $9`

	// queryDeleteCoupon removes a coupon by ID.
	queryDeleteCoupon = `DELETE FROM coupons WHERE id = $1`

	// queryIncrementUsage increments the usage count of a coupon.
	queryIncrementUsage = `UPDATE coupons SET usage_count = usage_count + 1, updated_at = now() WHERE id = $1`
)
