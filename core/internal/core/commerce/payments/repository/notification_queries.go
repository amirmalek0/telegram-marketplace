package repository

const queryQueuePaymentNotice = `WITH notice AS (
 INSERT INTO broadcasts(title,message,published_at,recipient_user_id,source_key,action_path)
 VALUES($1,$2,now(),$3,$4,$5)
 ON CONFLICT(source_key) WHERE source_key IS NOT NULL DO UPDATE SET source_key=EXCLUDED.source_key
 RETURNING id
 ) INSERT INTO payment_notification_outbox(notification_id,user_id,chat_id,message,template_key,template_vars)
 SELECT id,$3,$6,$2,$7,$8 FROM notice ON CONFLICT(notification_id) DO NOTHING`

const queryClaimPaymentNotice = `WITH candidate AS (
 SELECT n.id FROM payment_notification_outbox n JOIN users u ON u.id=n.user_id
 WHERE n.sent_at IS NULL AND n.failed_at IS NULL AND NOT u.is_banned
 AND n.next_attempt_at<=now() AND (n.lease_until IS NULL OR n.lease_until<now())
 ORDER BY n.next_attempt_at,n.id FOR UPDATE OF n SKIP LOCKED LIMIT 1
 ) UPDATE payment_notification_outbox n SET attempts=n.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '60 seconds'
 FROM candidate c WHERE n.id=c.id RETURNING n.id,n.chat_id,n.message,n.attempts,n.lease_token,n.template_key,n.template_vars`

const queryFinishPaymentNotice = `UPDATE payment_notification_outbox SET
 sent_at=CASE WHEN $3='sent' THEN now() ELSE sent_at END,
 failed_at=CASE WHEN $3='failed' THEN now() ELSE failed_at END,
 next_attempt_at=now()+($4 * interval '1 second'),lease_token=NULL,lease_until=NULL
 WHERE id=$1 AND lease_token=$2 AND sent_at IS NULL AND failed_at IS NULL`
