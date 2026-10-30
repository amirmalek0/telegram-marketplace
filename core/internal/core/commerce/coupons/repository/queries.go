package repository

// SQL query constants for the coupons repository.

const (
	queryCouponSummary = `SELECT
   COUNT(*) FILTER (WHERE is_active AND (expires_at IS NULL OR expires_at > now()) AND (usage_limit = 0 OR usage_count < usage_limit)),
   COUNT(*) FILTER (WHERE expires_at <= now()),
   COUNT(*)
 FROM coupons`
	queryCouponUser       = `SELECT id FROM users WHERE telegram_id=$1 AND NOT is_banned`
	queryCouponUsersExist = `SELECT COUNT(*) FROM users WHERE id=ANY($1::uuid[])`
	queryProductToman     = `SELECT toman_price FROM products WHERE id=$1 AND status='active'`
	queryProductStars     = `SELECT stars_price FROM products WHERE id=$1 AND status='active'`
	// queryCreateCoupon inserts a new coupon and returns the generated UUID.
	queryCreateCoupon = `
		INSERT INTO coupons (code, discount_type, discount_value, usage_limit, usage_count, expires_at, is_active, product_ids, created_at, updated_at, user_ids, currency_scope, toman_discount_type, toman_discount_value)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id`

	// queryGetCouponByID retrieves a coupon by its UUID.
	queryGetCouponByID = `
		SELECT id, code, discount_type, discount_value, usage_limit, usage_count, expires_at, is_active, product_ids, created_at, updated_at, user_ids, currency_scope, toman_discount_type, toman_discount_value
		FROM coupons
		WHERE id = $1`

	// queryGetCouponByCode retrieves a coupon by its code.
	queryGetCouponByCode = `
		SELECT id, code, discount_type, discount_value, usage_limit, usage_count, expires_at, is_active, product_ids, created_at, updated_at, user_ids, currency_scope, toman_discount_type, toman_discount_value
		FROM coupons
		WHERE code = $1`

	// queryListCoupons retrieves a paginated list of all coupons.
	queryListCoupons = `
		SELECT id, code, discount_type, discount_value, usage_limit, usage_count, expires_at, is_active, product_ids, created_at, updated_at, user_ids, currency_scope, toman_discount_type, toman_discount_value
		FROM coupons
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	// queryCountCoupons returns the total number of coupons.
	queryCountCoupons = `SELECT COUNT(*) FROM coupons`

	// queryUpdateCoupon updates a coupon.
	queryUpdateCoupon = `
		UPDATE coupons SET code = $1, discount_type = $2, discount_value = $3, usage_limit = $4, expires_at = $5, is_active = $6, product_ids = $7, updated_at = $8, user_ids = $10, currency_scope = $11, toman_discount_type = $12, toman_discount_value = $13
		WHERE id = $9`

	// queryDeleteCoupon removes a coupon by ID.
	queryDeleteCoupon = `DELETE FROM coupons WHERE id = $1`

	// queryIncrementUsage increments the usage count of a coupon.
	queryIncrementUsage = `UPDATE coupons SET usage_count = usage_count + 1, updated_at = now() WHERE id = $1`
)
