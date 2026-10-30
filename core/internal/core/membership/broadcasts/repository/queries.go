package repository

const (
	queryPublish = `INSERT INTO broadcasts (title,message,created_by,request_id,published_at)
	 VALUES ($1,$2,$3,$4,now()) ON CONFLICT(request_id) DO UPDATE SET request_id=EXCLUDED.request_id
	 WHERE broadcasts.title=EXCLUDED.title AND broadcasts.message=EXCLUDED.message AND broadcasts.created_by=EXCLUDED.created_by
	 RETURNING id,title,message,published_at,archived_at,0::bigint AS read_count`
	queryAdminList = `SELECT b.id,b.title,b.message,b.published_at,b.archived_at,
	 (SELECT COUNT(*) FROM broadcast_reads r WHERE r.broadcast_id=b.id) AS read_count
	 FROM broadcasts b WHERE published_at IS NOT NULL AND recipient_user_id IS NULL ORDER BY published_at DESC,id DESC LIMIT $1 OFFSET $2`
	queryAdminCount = `SELECT COUNT(*) FROM broadcasts WHERE published_at IS NOT NULL AND recipient_user_id IS NULL`
	queryArchive    = `UPDATE broadcasts SET archived_at=COALESCE(archived_at,now()) WHERE id=$1 AND published_at IS NOT NULL AND recipient_user_id IS NULL`
	queryUser       = `SELECT id FROM users WHERE telegram_id=$1 AND is_banned=false`
	queryInbox      = `SELECT b.id,b.title,b.message,b.published_at,r.read_at,b.action_path FROM broadcasts b
	 LEFT JOIN broadcast_reads r ON r.broadcast_id=b.id AND r.user_id=$1
	 WHERE b.published_at IS NOT NULL AND b.archived_at IS NULL AND (b.recipient_user_id IS NULL OR b.recipient_user_id=$1) ORDER BY b.published_at DESC,b.id DESC LIMIT $2 OFFSET $3`
	queryInboxCounts = `SELECT COUNT(*),COUNT(*) FILTER (WHERE r.broadcast_id IS NULL) FROM broadcasts b
	 LEFT JOIN broadcast_reads r ON r.broadcast_id=b.id AND r.user_id=$1
	 WHERE b.published_at IS NOT NULL AND b.archived_at IS NULL AND (b.recipient_user_id IS NULL OR b.recipient_user_id=$1)`
	queryRead = `INSERT INTO broadcast_reads (broadcast_id,user_id)
	 SELECT id,$2 FROM broadcasts WHERE id=$1 AND published_at IS NOT NULL AND archived_at IS NULL AND (recipient_user_id IS NULL OR recipient_user_id=$2)
	 ON CONFLICT(broadcast_id,user_id) DO UPDATE SET read_at=broadcast_reads.read_at RETURNING read_at`
	queryReadAll = `INSERT INTO broadcast_reads (broadcast_id,user_id)
	 SELECT id,$1 FROM broadcasts WHERE published_at IS NOT NULL AND archived_at IS NULL AND (recipient_user_id IS NULL OR recipient_user_id=$1)
	 ON CONFLICT(broadcast_id,user_id) DO NOTHING`
)
