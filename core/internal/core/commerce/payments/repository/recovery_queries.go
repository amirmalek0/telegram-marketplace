package repository

const queryRecordRefund = `UPDATE payments p SET status='refunded',external_transaction_id=$2,refunded_at=COALESCE(refunded_at,now()),updated_at=now()
 FROM users u WHERE p.user_id=u.id AND u.telegram_id=$3 AND p.checkout_reference=$1
 AND NOT p.is_test AND p.status IN ('pending','failed','refunded') RETURNING p.order_id`

const queryRefundIntended = `SELECT EXISTS(SELECT 1 FROM payment_refunds WHERE charge_id=$1)`
const queryRefundAlreadySettled = `SELECT EXISTS(SELECT 1 FROM payments WHERE external_transaction_id=$1 AND status='succeeded' AND NOT is_test)`
const queryPrepareRefund = `INSERT INTO payment_refunds(charge_id,checkout_reference,telegram_id) VALUES($1,$2,$3) ON CONFLICT(charge_id) DO NOTHING`
const queryCompleteRefund = `UPDATE payment_refunds SET completed_at=COALESCE(completed_at,now()) WHERE charge_id=$1 AND telegram_id=$2`
