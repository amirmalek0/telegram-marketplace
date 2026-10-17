package repository

const (
	queryLockCheckoutCoupon = `SELECT id,code,discount_type,discount_value,usage_limit,usage_count,expires_at,is_active,product_ids,created_at,updated_at,user_ids FROM coupons WHERE code=$1 FOR UPDATE`
	queryPendingCouponUsage = `SELECT COUNT(*) FROM orders WHERE coupon_id=$1 AND status='pending'`
	queryConsumeOrderCoupon = `UPDATE coupons SET usage_count=usage_count+1,updated_at=now() WHERE id=(SELECT coupon_id FROM orders WHERE id=$1)`
)
