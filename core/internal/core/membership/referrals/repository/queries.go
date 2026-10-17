package repository

const querySettings = `SELECT enabled,inviter_stars,invitee_stars,reward_trigger,inviter_message,invitee_message FROM referral_settings WHERE id=true`
const queryLockSettings = querySettings + ` FOR SHARE`
const querySaveSettings = `UPDATE referral_settings SET enabled=$1,inviter_stars=$2,invitee_stars=$3,reward_trigger=$4,updated_by=$5,updated_at=now(),inviter_message=COALESCE(NULLIF($6,''),inviter_message),invitee_message=COALESCE(NULLIF($7,''),invitee_message) WHERE id=true`
const queryOnboard = `INSERT INTO users(telegram_id,first_name,last_name,username) VALUES($1,$2,$3,$4)
 ON CONFLICT(telegram_id) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,username=EXCLUDED.username
 RETURNING id,(xmax=0)`
const queryAttribute = `INSERT INTO referrals(inviter_id,invitee_id,invitee_telegram_id,inviter_stars,invitee_stars,reward_trigger)
 SELECT c.user_id,$2,$3,$4,$5,$6 FROM referral_codes c JOIN users u ON u.id=c.user_id
 WHERE c.code=$1 AND c.user_id<>$2 AND NOT u.is_banned
 ON CONFLICT(invitee_telegram_id) DO NOTHING`
const queryUser = `SELECT id FROM users WHERE telegram_id=$1 AND NOT is_banned`
const queryCode = `INSERT INTO referral_codes(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING code`
const querySummary = `SELECT count(*),count(*) FILTER(WHERE rewarded_at IS NOT NULL),COALESCE(sum(inviter_stars) FILTER(WHERE rewarded_at IS NOT NULL),0)::bigint FROM referrals WHERE inviter_id=$1`
const queryInvitation = `SELECT reward_trigger,invitee_stars,rewarded_at FROM referrals WHERE invitee_id=$1`
const eligible = `r.rewarded_at IS NULL AND r.inviter_id IS NOT NULL AND r.invitee_id IS NOT NULL AND (
 r.reward_trigger='bot_open' OR
 (r.reward_trigger='phone_verified' AND EXISTS(SELECT 1 FROM users u WHERE u.id=r.invitee_id AND u.phone_verified_at IS NOT NULL AND u.phone_number<>'')) OR
 (r.reward_trigger='first_purchase' AND EXISTS(SELECT 1 FROM payments p WHERE p.user_id=r.invitee_id AND p.status='succeeded'
 AND p.purpose IN ('product','vip_plan') AND p.amount_minor>0 AND NOT p.is_test AND p.paid_at>=r.created_at)))`
const queryEligible = `SELECT r.invitee_telegram_id FROM referrals r JOIN users a ON a.id=r.inviter_id JOIN users b ON b.id=r.invitee_id
 WHERE ` + eligible + ` AND NOT a.is_banned AND NOT b.is_banned ORDER BY r.created_at LIMIT 200`
const queryLockReward = `SELECT r.id,r.inviter_id,r.invitee_id,r.inviter_stars,r.invitee_stars FROM referrals r
 WHERE r.invitee_telegram_id=$1 AND ` + eligible + ` FOR UPDATE OF r`

// Wallet rows are always locked in UUID order to avoid reciprocal referral deadlocks.
const queryLockWallets = `SELECT id,wallet_balance,is_banned,telegram_id,COALESCE(first_name,''),COALESCE(last_name,''),COALESCE(username,'') FROM users WHERE id IN ($1,$2) ORDER BY id FOR UPDATE`
const queryCredit = `UPDATE users SET wallet_balance=wallet_balance+$2 WHERE id=$1`
const queryLedger = `INSERT INTO wallet_transactions(user_id,type,amount,balance_before,balance_after,description,referral_id)
 VALUES($1,'reward',$2,$3,$4,$5,$6)`
const queryMarkRewarded = `UPDATE referrals SET rewarded_at=now() WHERE id=$1`
