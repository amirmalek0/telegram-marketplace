package repository

const walletTopupPackColumns = `id, title, stars, status, sort_order, created_at, updated_at`

const (
	queryListWalletTopupPacks       = `SELECT ` + walletTopupPackColumns + ` FROM wallet_topup_packs ORDER BY sort_order ASC, stars ASC, created_at ASC`
	queryListActiveWalletTopupPacks = `SELECT ` + walletTopupPackColumns + ` FROM wallet_topup_packs WHERE status = 'active' ORDER BY sort_order ASC, stars ASC, created_at ASC`
	queryCreateWalletTopupPack      = `INSERT INTO wallet_topup_packs (title, stars, status, sort_order) VALUES ($1,$2,$3,$4) RETURNING ` + walletTopupPackColumns
	queryUpdateWalletTopupPack      = `UPDATE wallet_topup_packs SET title=$2, stars=$3, status=$4, sort_order=$5, updated_at=now() WHERE id=$1 RETURNING ` + walletTopupPackColumns
	queryDeleteWalletTopupPack      = `DELETE FROM wallet_topup_packs WHERE id=$1`
	queryGetActiveWalletTopupPack   = `SELECT ` + walletTopupPackColumns + ` FROM wallet_topup_packs WHERE id=$1 AND status='active'`
	queryListAdminWallets           = `
		SELECT u.id,u.first_name,u.last_name,u.username,u.telegram_id,u.wallet_balance,
		       COALESCE(u.has_active_plan AND u.plan_expire_at > now(),false),u.plan_expire_at,COUNT(wt.id),u.photo_url,u.phone_number
		FROM users u LEFT JOIN wallet_transactions wt ON wt.user_id=u.id
		GROUP BY u.id ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`
	queryCountUsers     = `SELECT COUNT(*) FROM users`
	queryGetAdminWallet = `
		SELECT u.id,u.first_name,u.last_name,u.username,u.telegram_id,u.wallet_balance,
		       COALESCE(u.has_active_plan AND u.plan_expire_at > now(),false),u.plan_expire_at,
		       (SELECT COUNT(*) FROM wallet_transactions WHERE user_id=u.id),u.photo_url,u.phone_number
		FROM users u WHERE u.id=$1`
	queryListWalletTransactionsByUserID = `SELECT id,type,amount,balance_before,balance_after,description,created_at FROM wallet_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`
	queryLockWalletBalanceByUserID      = `SELECT wallet_balance FROM users WHERE id=$1 FOR UPDATE`
	queryUpdateWalletBalance            = `UPDATE users SET wallet_balance=$2 WHERE id=$1`
	queryInsertAdminWalletAdjustment    = `INSERT INTO wallet_transactions (user_id,type,amount,balance_before,balance_after,description) VALUES ($1,'admin_adjust',$2,$3,$4,$5)`
	queryGetVIPQuoteData                = `
		SELECT target.title,target.stars_price,target.tier,u.active_plan_id,u.plan_expire_at,
		       COALESCE(current.title,''),COALESCE(current.stars_price,0),COALESCE(current.duration,0),COALESCE(current.tier,0)
		FROM vip_plans target JOIN users u ON u.telegram_id=$2
		LEFT JOIN vip_plans current ON current.id=u.active_plan_id
		WHERE target.id=$1 AND target.status='active'`
	queryGetActiveVIPPlanDuration     = `SELECT duration FROM vip_plans WHERE id=$1 AND status='active'`
	queryGetWalletByTelegramID        = `SELECT id,wallet_balance FROM users WHERE telegram_id=$1`
	queryGetWalletBalanceByTelegramID = `SELECT wallet_balance FROM users WHERE telegram_id=$1`
)
