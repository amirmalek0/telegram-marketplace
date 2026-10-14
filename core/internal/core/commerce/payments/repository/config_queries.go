package repository

const (
	queryGetPaymentConfig    = `SELECT payment_test_mode, updated_at FROM settings WHERE id=$1`
	queryUpdatePaymentConfig = `UPDATE settings SET payment_test_mode=$2, updated_at=now() WHERE id=$1 RETURNING payment_test_mode, updated_at`
)
