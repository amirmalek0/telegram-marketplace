package repository

const seedSQL = `INSERT INTO user_photo_sync(user_id) SELECT id FROM users ON CONFLICT DO NOTHING`
const scheduleSQL = `INSERT INTO user_photo_sync(user_id) VALUES($1) ON CONFLICT DO NOTHING`
// Visits may accelerate a completed daily sync, but never reset a pending
// pagination checkpoint, an active lease, or a failed job's retry backoff.
const scheduleVisitSQL = `INSERT INTO user_photo_sync(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE
 SET next_at=now(),next_offset=0,status='pending',error=''
 WHERE user_photo_sync.status='ready'
 AND user_photo_sync.last_synced_at <= now()-interval '15 minutes'
 AND (user_photo_sync.last_attempt_at IS NULL OR user_photo_sync.last_attempt_at <= now()-interval '15 minutes')
 AND (user_photo_sync.locked_until IS NULL OR user_photo_sync.locked_until < now())`
const requestSQL = `INSERT INTO user_photo_sync(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE
 SET next_at=now(),next_offset=0,status='pending',error=''
 WHERE (user_photo_sync.last_attempt_at IS NULL OR user_photo_sync.last_attempt_at < now()-interval '1 minute')
 AND (user_photo_sync.locked_until IS NULL OR user_photo_sync.locked_until < now())`
const claimSQL = `WITH candidate AS (
 SELECT user_id FROM user_photo_sync WHERE next_at<=now() AND (locked_until IS NULL OR locked_until<now())
 ORDER BY next_at LIMIT 1 FOR UPDATE SKIP LOCKED
), claimed AS (
 UPDATE user_photo_sync s SET status='syncing',locked_until=now()+interval '5 minutes',last_attempt_at=now()
 FROM candidate c WHERE s.user_id=c.user_id RETURNING s.user_id,s.next_offset
) SELECT c.user_id::text,u.telegram_id,c.next_offset FROM claimed c JOIN users u ON u.id=c.user_id`
const existingSQL = `SELECT id::text,user_id::text,telegram_unique_id,storage_key,content_type,width,height,sort_order,saved_at FROM user_profile_photos WHERE user_id=$1 AND telegram_unique_id=$2`
const getSQL = `SELECT id::text,user_id::text,telegram_unique_id,storage_key,content_type,width,height,sort_order,saved_at FROM user_profile_photos WHERE user_id=$1 AND id=$2`
const saveSQL = `INSERT INTO user_profile_photos(id,user_id,telegram_unique_id,storage_key,content_type,width,height,sort_order)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,telegram_unique_id) DO UPDATE SET sort_order=EXCLUDED.sort_order,last_seen_at=now()`
const currentSQL = `UPDATE users SET photo_url=$2 WHERE id=$1`
const finishSQL = `UPDATE user_photo_sync SET locked_until=NULL,status=$2,next_offset=$3,error=$4,
 next_at=CASE WHEN $2='pending' THEN now() WHEN $2='error' THEN now()+interval '15 minutes' ELSE now()+interval '24 hours' END,
 last_synced_at=CASE WHEN $2='ready' THEN now() ELSE last_synced_at END WHERE user_id=$1`
const listSQL = `SELECT p.id::text,p.user_id::text,p.telegram_unique_id,p.storage_key,p.content_type,p.width,p.height,p.sort_order,p.saved_at,
 (u.photo_url='/api/v1/user/'||p.user_id::text||'/photos/'||p.id::text||'/content') AS current
 FROM user_profile_photos p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1
 ORDER BY current DESC,p.sort_order,p.saved_at DESC,p.id LIMIT $2 OFFSET $3`
const countSQL = `SELECT count(*) FROM user_profile_photos WHERE user_id=$1`
const stateSQL = `SELECT status,last_synced_at,error FROM user_photo_sync WHERE user_id=$1`
const ownerSQL = `SELECT telegram_id FROM users WHERE id=$1`
const deletionsSQL = `SELECT storage_key FROM user_photo_deletions LIMIT 30`
const deletedSQL = `DELETE FROM user_photo_deletions WHERE storage_key=$1`
