package repository

const queryQueueNotification = `INSERT INTO referral_notifications(referral_id,user_id,role,chat_id,message,template_vars)
 VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(referral_id,role) DO NOTHING`

const queryClaimNotification = `WITH candidate AS (
 SELECT n.id FROM referral_notifications n JOIN users u ON u.id=n.user_id
 WHERE n.sent_at IS NULL AND n.failed_at IS NULL AND NOT u.is_banned
 AND n.next_attempt_at<=now() AND (n.lease_until IS NULL OR n.lease_until<now())
 ORDER BY n.next_attempt_at,n.id FOR UPDATE OF n SKIP LOCKED LIMIT 1
 ) UPDATE referral_notifications n SET attempts=n.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '60 seconds'
 FROM candidate c WHERE n.id=c.id RETURNING n.id,n.chat_id,n.message,n.attempts,n.lease_token,n.role,n.template_vars`

const queryFinishNotification = `UPDATE referral_notifications SET
 sent_at=CASE WHEN $3='sent' THEN now() ELSE sent_at END,
 failed_at=CASE WHEN $3='failed' THEN now() ELSE failed_at END,
 next_attempt_at=now()+($4 * interval '1 second'),lease_token=NULL,lease_until=NULL
 WHERE id=$1 AND lease_token=$2 AND sent_at IS NULL AND failed_at IS NULL`
