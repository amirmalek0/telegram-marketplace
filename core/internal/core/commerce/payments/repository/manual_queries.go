package repository

const (
	queryManualConfig       = `SELECT value,revision FROM manual_payment_config WHERE id=true`
	queryManualConfigLock   = queryManualConfig + ` FOR SHARE`
	queryUpdateManualConfig = `UPDATE manual_payment_config SET value=jsonb_set($1::jsonb,'{enabled}',COALESCE(value->'enabled','false'::jsonb)),revision=revision+1,updated_by=$2,updated_at=now() WHERE id=true AND revision=$3 RETURNING revision`
	queryManualPrices       = `SELECT 'product' AS purpose,id AS target_id,title,toman_price,stars_price AS stars,status FROM products
	 UNION ALL SELECT 'vip_plan',id,title,toman_price,stars_price,status FROM vip_plans
	 UNION ALL SELECT 'wallet_topup',id,title,toman_price,stars,status FROM wallet_topup_packs`
	queryListManualPrices    = `SELECT * FROM (` + queryManualPrices + `) p ORDER BY purpose,title LIMIT $1 OFFSET $2`
	queryManualPrice         = `SELECT p.purpose,p.target_id,p.title,p.toman_price,p.stars,p.status FROM (` + queryManualPrices + `) p JOIN manual_payment_config c ON c.id=true WHERE p.purpose=$1 AND p.target_id=$2 AND p.status='active' AND p.toman_price>0`
	queryProductToman        = `SELECT toman_price FROM products WHERE id=$1 AND status='active' FOR SHARE`
	queryVIPToman            = `SELECT title,toman_price,stars_price,duration,tier FROM vip_plans WHERE id=$1 AND status='active' FOR SHARE`
	queryPackToman           = `SELECT title,toman_price,stars FROM wallet_topup_packs WHERE id=$1 AND status='active' FOR SHARE`
	queryUpdateProductToman  = `UPDATE products SET toman_price=$2,updated_at=now() WHERE id=$1`
	queryUpdateVIPToman      = `UPDATE vip_plans SET toman_price=$2 WHERE id=$1`
	queryUpdatePackToman     = `UPDATE wallet_topup_packs SET toman_price=$2,updated_at=now() WHERE id=$1`
	queryManualRequest       = `SELECT m.payment_id,p.purpose,p.target_id,COALESCE(p.checkout_data->>'coupon_code','') FROM manual_payment_reviews m JOIN payments p ON p.id=m.payment_id WHERE m.user_id=$1 AND m.request_id=$2`
	queryManualPendingCount  = `SELECT COUNT(*) FROM manual_payment_reviews WHERE user_id=$1 AND status IN ('awaiting_proof','submitted')`
	queryManualVIPState      = `SELECT COALESCE(active_plan_id,''),plan_expire_at FROM users WHERE id=$1`
	queryManualActiveVIPTier = `SELECT COALESCE((SELECT tier FROM vip_plans WHERE id::text=$1),0)`
	queryManualVIPCredit     = `SELECT toman_price,duration FROM vip_plans WHERE id::text=$1`
	queryCreateManualPayment = `INSERT INTO payments(order_id,user_id,purpose,target_id,method,currency,amount_minor,checkout_reference,is_test,status,checkout_data)
	 VALUES($1,$2,$3,$4,'card_to_card','IRR',$5,$6,$7,'pending',$8) RETURNING id`
	queryCreateManualReview  = `INSERT INTO manual_payment_reviews(payment_id,request_id,user_id,title,cards,instructions) VALUES($1,$2,$3,$4,$5,$6)`
	queryManualOrderCurrency = `UPDATE orders SET currency='IRR' WHERE id=$1`
	queryManualCheckout      = `SELECT p.id,p.order_id,p.user_id,trim(u.first_name||' '||u.last_name),u.username,p.purpose,p.target_id,m.title,p.amount_minor/10,m.status,p.is_test,m.cards,m.instructions,
	 m.transaction_id,m.destination_card_id,m.receipt_key,m.review_note,m.reviewed_by,m.reviewed_at,m.created_at,m.submitted_at,p.checkout_data
	 FROM payments p JOIN manual_payment_reviews m ON m.payment_id=p.id JOIN users u ON u.id=p.user_id`
	queryGetManualCheckout  = queryManualCheckout + ` WHERE p.id=$1 AND ($2::bigint=0 OR u.telegram_id=$2)`
	queryListManualCheckout = queryManualCheckout + ` WHERE ($1::bigint=0 OR u.telegram_id=$1) AND ($2='' OR m.status=$2) ORDER BY m.created_at DESC LIMIT $3 OFFSET $4`
	queryLockManualPayment  = `SELECT p.user_id,p.order_id,p.purpose,p.target_id,p.is_test,p.checkout_data,m.status,u.telegram_id,u.is_banned
	 FROM payments p JOIN manual_payment_reviews m ON m.payment_id=p.id JOIN users u ON u.id=p.user_id
	 WHERE p.id=$1 AND ($2::bigint=0 OR u.telegram_id=$2) FOR UPDATE OF p,m,u`
	querySubmitManualProof    = `UPDATE manual_payment_reviews SET status='submitted',transaction_id=$2,destination_card_id=$3,receipt_key=$4,receipt_hash=$5,submitted_at=now() WHERE payment_id=$1`
	queryApproveFreeManual    = `UPDATE manual_payment_reviews SET status='approved',coupon_settled=true,review_note='تسویه کامل با کد تخفیف؛ بدون واریز',reviewed_at=now() WHERE payment_id=$1`
	queryReviewManual         = `UPDATE manual_payment_reviews SET status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now() WHERE payment_id=$1`
	queryCancelManual         = `UPDATE manual_payment_reviews SET status='cancelled' WHERE payment_id=$1 AND status='awaiting_proof'`
	queryExpiredManual        = `SELECT payment_id FROM manual_payment_reviews WHERE status='awaiting_proof' AND created_at<now()-interval '24 hours' ORDER BY created_at LIMIT 100`
	queryExpireManual         = `UPDATE manual_payment_reviews SET status='cancelled',review_note='مهلت ارسال رسید تمام شد. اگر واریز کرده‌اید با پشتیبانی تماس بگیرید.' WHERE payment_id=$1 AND status='awaiting_proof' AND created_at<now()-interval '24 hours'`
	queryApproveManualPayment = `UPDATE payments SET status='succeeded',paid_at=now(),updated_at=now() WHERE id=$1 AND status='pending'`
)
