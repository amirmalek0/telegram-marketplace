package repository

const queryListAdminPayments = `SELECT
 p.id,p.order_id,p.user_id,p.purpose,p.target_id,p.method,p.currency,p.amount_minor,
 p.checkout_reference,p.external_transaction_id,p.provider_transaction_id,p.is_test,
 p.status,p.provider_data,p.created_at,p.updated_at,p.paid_at,p.refunded_at,
 CASE WHEN u.id IS NOT NULL THEN jsonb_build_object('id',u.id,'first_name',u.first_name,
 'last_name',u.last_name,'username',u.username,'telegram_id',u.telegram_id) END AS "user",
 CASE p.purpose
 WHEN 'product' THEN COALESCE(NULLIF(d.product_title,''),NULLIF(product.title,''),'محصول حذف‌شده')
 WHEN 'vip_plan' THEN COALESCE(NULLIF(p.checkout_data->>'plan_title',''),NULLIF(v.title,''),'اشتراک VIP')
 WHEN 'wallet_topup' THEN COALESCE(NULLIF(p.checkout_data->>'pack_title',''),NULLIF(w.title,''),'شارژ کیف پول')
 ELSE 'پرداخت' END AS target_title,
 CASE WHEN p.purpose='product' THEN COALESCE(o.product_id,p.target_id) END AS product_id,
 COALESCE(o.quantity,0)::int AS quantity,COALESCE(o.coupon_code,'') AS coupon_code,
 COALESCE(o.discount_amount,0)::bigint AS discount_stars
 FROM payments p
 LEFT JOIN users u ON u.id=p.user_id
 LEFT JOIN orders o ON o.id=p.order_id
 LEFT JOIN order_deliveries d ON d.order_id=o.id
 LEFT JOIN products product ON product.id=COALESCE(o.product_id,p.target_id) AND p.purpose='product'
 LEFT JOIN vip_plans v ON v.id=p.target_id AND p.purpose='vip_plan'
 LEFT JOIN wallet_topup_packs w ON w.id=p.target_id AND p.purpose='wallet_topup'
 WHERE p.method=$1 ORDER BY p.created_at DESC,p.id DESC LIMIT $2 OFFSET $3`

// Counts cover all attempts; paid_stars excludes test payments and refunds.
const queryAdminPaymentsSummary = `SELECT COUNT(*),
 COUNT(*) FILTER (WHERE status='succeeded'),COUNT(*) FILTER (WHERE status='pending'),
 COUNT(*) FILTER (WHERE status='failed'),COUNT(*) FILTER (WHERE status='refunded'),
 COUNT(*) FILTER (WHERE is_test),
 COALESCE(SUM(amount_minor) FILTER (WHERE status='succeeded' AND NOT is_test),0)::bigint
 FROM payments WHERE method=$1`
