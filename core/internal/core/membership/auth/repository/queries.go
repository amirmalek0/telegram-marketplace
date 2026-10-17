package repository

const (
	queryCreateSession = `WITH created AS (INSERT INTO admin_sessions(id,admin_id,refresh_id,expires_at) VALUES($1,$2,$3,$4) RETURNING admin_id) UPDATE admins SET last_login_at=now() FROM created WHERE admins.id=created.admin_id`
	queryRotateSession = `UPDATE admin_sessions SET refresh_id=$4,expires_at=$5 WHERE id=$1 AND admin_id=$2 AND refresh_id=$3 AND expires_at>now()`
	queryValidSession  = `SELECT EXISTS(SELECT 1 FROM admin_sessions WHERE id=$1 AND admin_id=$2 AND expires_at>now())`
	queryRevokeSession = `DELETE FROM admin_sessions WHERE id=$1 AND admin_id=$2`
	queryCleanSessions = `DELETE FROM admin_sessions WHERE expires_at<=now()`
)
