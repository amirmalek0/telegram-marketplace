package repository

const (
	queryProductAccess               = `SELECT p.vip_only,(u.has_active_plan AND u.plan_expire_at>now()) FROM products p CROSS JOIN users u WHERE p.id=$1 AND p.status='active' AND u.telegram_id=$2`
	queryLockCheckoutUser            = `SELECT id,is_banned,wallet_balance,(has_active_plan AND plan_expire_at>now()) FROM users WHERE telegram_id=$1 FOR UPDATE`
	queryGetCheckoutProduct          = `SELECT id,title,description,stars_price,delivery_type,file_id,message_id,inventory_id,bundle_id,api_id,vip_only,repurchasable FROM products WHERE id=$1 AND status='active' FOR SHARE`
	queryAlreadyPurchased            = `SELECT EXISTS(SELECT 1 FROM orders WHERE user_id=$1 AND product_id=$2 AND status IN ('pending','paid'))`
	queryCreatePendingOrder          = `INSERT INTO orders (user_id,product_id,quantity,amount,discount_amount,payment_method,status,created_at,updated_at) VALUES ($1,$2,1,$3,0,$4,'pending',now(),now()) RETURNING id`
	queryCreatePaidOrder             = `INSERT INTO orders (user_id,product_id,quantity,amount,discount_amount,payment_method,status,paid_at,created_at,updated_at) VALUES ($1,$2,1,$3,0,$4,'paid',now(),now(),now()) RETURNING id`
	queryCreateProductStarsPayment   = `INSERT INTO payments (order_id,user_id,purpose,target_id,method,currency,amount_minor,checkout_reference,is_test,status,created_at,updated_at) VALUES ($1,$2,'product',$3,'telegram_stars','XTR',$4,$5,$6,'pending',now(),now()) RETURNING id`
	queryCreateProductWalletPayment  = `INSERT INTO payments (order_id,user_id,purpose,target_id,method,currency,amount_minor,checkout_reference,is_test,status,paid_at,created_at,updated_at) VALUES ($1,$2,'product',$3,'wallet','XTR',$4,$5,false,'succeeded',now(),now(),now()) RETURNING id`
	queryCreateDelivery              = `INSERT INTO order_deliveries (order_id,user_id,product_id,product_title) VALUES ($1,$2,$3,$4) RETURNING id`
	queryAddDeliveryFile             = `INSERT INTO order_delivery_items (delivery_id,kind,label,file_id,status,sort_order) SELECT $1,'file',name,id,'ready',$3 FROM files WHERE id=$2`
	queryAddDeliveryMessage          = `INSERT INTO order_delivery_items (delivery_id,kind,label,content,status,sort_order) SELECT $1,'message','اطلاعات محصول',content,'ready',$3 FROM delivery_messages WHERE id=$2`
	queryReserveInventory            = `UPDATE inventory_items SET status='reserved',reserved_at=now(),order_id=$2,user_id=$3 WHERE id=(SELECT id FROM inventory_items WHERE inventory_id=$1 AND status='available' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING value`
	queryAddDeliveryInventory        = `INSERT INTO order_delivery_items (delivery_id,kind,label,content,status,sort_order) VALUES ($1,'inventory','اطلاعات اختصاصی',$2,'ready',$3)`
	queryGetBundleItems              = `SELECT file_id,message_id,inventory_id FROM bundles WHERE id=$1`
	queryAddDeliveryAPI              = `INSERT INTO order_delivery_items (delivery_id,kind,label,api_id,status,sort_order) SELECT $1,'api',COALESCE(NULLIF(name,''),'تحویل خودکار'),id,'pending',0 FROM apis WHERE id=$2`
	queryMarkInventorySold           = `UPDATE inventory_items SET status='sold',sold_at=now(),reserved_at=NULL WHERE order_id=$1 AND status='reserved'`
	queryMarkDeliveryReady           = `UPDATE order_deliveries SET status=CASE WHEN EXISTS(SELECT 1 FROM order_delivery_items WHERE delivery_id=$1 AND kind='api') THEN 'processing' ELSE 'delivered' END, delivered_at=CASE WHEN EXISTS(SELECT 1 FROM order_delivery_items WHERE delivery_id=$1 AND kind='api') THEN NULL ELSE now() END,updated_at=now() WHERE id=$1`
	queryCreateVIPWalletPayment      = `INSERT INTO payments (user_id,purpose,target_id,method,currency,amount_minor,checkout_reference,checkout_data,is_test,status,paid_at,created_at,updated_at) VALUES ($1,'vip_plan',$2,'wallet','XTR',$3,$4,$5::jsonb,false,'succeeded',now(),now(),now()) RETURNING id`
	queryCreateStandalonePayment     = `INSERT INTO payments (user_id,purpose,target_id,method,currency,amount_minor,checkout_reference,checkout_data,is_test,status,created_at,updated_at) VALUES ($1,$2,$3,'telegram_stars','XTR',$4,$5,$6::jsonb,$7,'pending',now(),now()) RETURNING id`
	queryCreateWalletTransaction     = `INSERT INTO wallet_transactions (user_id,type,amount,balance_before,balance_after,payment_id,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (payment_id) DO NOTHING`
	queryGetActivationData           = `SELECT checkout_data->>'plan_title',(checkout_data->>'duration_days')::int,(checkout_data->>'stars_price')::bigint,COALESCE((checkout_data->>'is_upgrade')::boolean,false) FROM payments WHERE id=$1`
	queryGetActivationWindow         = `SELECT CASE WHEN $3 THEN now() ELSE GREATEST(now(),COALESCE(plan_expire_at,now())) END,CASE WHEN $3 THEN now() ELSE GREATEST(now(),COALESCE(plan_expire_at,now())) END+($2*interval '1 day') FROM users WHERE id=$1 FOR UPDATE`
	queryInsertVIPSubscription       = `INSERT INTO user_vip_subscriptions (user_id,plan_id,plan_title,duration_days,stars_price,payment_id,payment_method,starts_at,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (payment_id) DO NOTHING`
	queryActivateUserVIP             = `UPDATE users SET has_active_plan=true,active_plan_id=$2,plan_expire_at=$3 WHERE id=$1`
	queryGetTestPayment              = `SELECT p.order_id,p.checkout_reference,p.currency,p.amount_minor,p.status,p.purpose FROM payments p JOIN users u ON u.id=p.user_id WHERE p.id=$1 AND p.method='telegram_stars' AND u.telegram_id=$2 AND p.is_test=true`
	queryFailPayment                 = `UPDATE payments SET status='failed',updated_at=now(),provider_data=$2::jsonb WHERE id=$1 AND status='pending'`
	queryFailOrder                   = `UPDATE orders SET status='failed',updated_at=now() WHERE id=$1 AND status='pending'`
	queryCancelFailedOrder           = `UPDATE orders SET status='cancelled',updated_at=now() WHERE id=$1 AND status='failed'`
	queryFailDeliveryByOrder         = `UPDATE order_deliveries SET status='failed',error=$2,updated_at=now() WHERE order_id=$1`
	queryReleaseInventoryByOrder     = `UPDATE inventory_items SET status='available',reserved_at=NULL,order_id=NULL,user_id=NULL WHERE order_id=$1 AND status='reserved'`
	queryDeliveryOutcome             = `SELECT status,error FROM order_deliveries WHERE order_id=$1`
	queryExpireOrders                = `UPDATE orders SET status='cancelled',updated_at=now() WHERE status='pending' AND id IN (SELECT order_id FROM payments WHERE method='telegram_stars' AND status='pending' AND created_at<now()-interval '30 minutes')`
	queryExpireDeliveries            = `UPDATE order_deliveries SET status='failed',error='checkout expired',updated_at=now() WHERE status='awaiting_payment' AND order_id IN (SELECT order_id FROM payments WHERE method='telegram_stars' AND status='pending' AND created_at<now()-interval '30 minutes')`
	queryExpireInventory             = `UPDATE inventory_items SET status='available',reserved_at=NULL,order_id=NULL,user_id=NULL WHERE status='reserved' AND order_id IN (SELECT order_id FROM payments WHERE method='telegram_stars' AND status='pending' AND created_at<now()-interval '30 minutes')`
	queryExpirePayments              = `UPDATE payments SET status='failed',provider_data='{"error":"checkout expired"}'::jsonb,updated_at=now() WHERE method='telegram_stars' AND status='pending' AND created_at<now()-interval '30 minutes'`
	queryValidatePreCheckout         = `SELECT p.currency,p.amount_minor,p.status,o.status,u.telegram_id,p.purpose FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN orders o ON o.id=p.order_id WHERE p.checkout_reference=$1 AND p.method='telegram_stars' AND p.is_test=false`
	queryLockPaymentForSettlement    = `SELECT p.id,p.order_id,p.user_id,p.purpose,p.target_id,p.currency,p.amount_minor,p.is_test,p.status,o.status,u.telegram_id,p.external_transaction_id FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN orders o ON o.id=p.order_id WHERE p.checkout_reference=$1 AND p.method='telegram_stars' FOR UPDATE OF p,u`
	querySucceedPayment              = `UPDATE payments SET status='succeeded',external_transaction_id=$2,provider_transaction_id=NULLIF($3,''),provider_data=$4,paid_at=now(),updated_at=now() WHERE id=$1`
	queryLockDeliveryByOrder         = `SELECT id FROM order_deliveries WHERE order_id=$1 FOR UPDATE`
	queryPayOrder                    = `UPDATE orders SET status='paid',paid_at=now(),updated_at=now() WHERE id=$1`
	queryListPendingAPIDeliveryItems = `SELECT id,api_id FROM order_delivery_items WHERE delivery_id=$1 AND kind='api' AND status IN ('pending','failed') ORDER BY sort_order`
	queryClaimAPIDeliveryItem        = `UPDATE order_delivery_items SET status='processing',error=NULL,updated_at=now() WHERE id=$1 AND status IN ('pending','failed')`
	queryFailAPIDeliveryItem         = `UPDATE order_delivery_items SET status='failed',error=$2,updated_at=now() WHERE id=$1`
	queryFailAPIDelivery             = `UPDATE order_deliveries SET status='failed',error=$2,updated_at=now() WHERE id=$1`
	queryCompleteAPIDeliveryItem     = `UPDATE order_delivery_items SET status='ready',content=$2,error=NULL,updated_at=now() WHERE id=$1`
	queryCompleteAPIDelivery         = `UPDATE order_deliveries SET status='delivered',error=NULL,delivered_at=COALESCE(delivered_at,now()),updated_at=now() WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM order_delivery_items WHERE delivery_id=$1 AND status<>'ready')`
)
