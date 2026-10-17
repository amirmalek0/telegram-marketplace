package repository

const (
	queryEnqueue = `INSERT INTO telegram_failed_updates(update_id,payload,next_attempt_at) VALUES($1,$2,now()+interval '2 minutes') ON CONFLICT(update_id) DO NOTHING`
	queryClaim   = `UPDATE telegram_failed_updates SET next_attempt_at=now()+interval '2 minutes',attempts=attempts+1
 WHERE update_id=(SELECT update_id FROM telegram_failed_updates WHERE next_attempt_at<=now() AND NOT dead_letter
 ORDER BY next_attempt_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING update_id,payload,attempts`
	queryDone  = `DELETE FROM telegram_failed_updates WHERE update_id=$1`
	queryRetry = `UPDATE telegram_failed_updates SET next_attempt_at=now()+interval '5 minutes',dead_letter=$2 WHERE update_id=$1`
)
