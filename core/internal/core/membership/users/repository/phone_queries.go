package repository

// Profile writes must never change a phone number or its verification marker.
const queryUpsertProfile = `
 INSERT INTO users (telegram_id, first_name, last_name, username, referred_by)
 VALUES ($1, $2, $3, $4, $5)
 ON CONFLICT (telegram_id) DO UPDATE SET
 first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, username = EXCLUDED.username
 RETURNING id, (xmax = 0)`

const queryPhoneVerified = `SELECT EXISTS (
 SELECT 1 FROM users WHERE telegram_id = $1 AND phone_verified_at IS NOT NULL AND phone_number <> ''
)`

// Only trusted Telegram contact updates reach this query; profile APIs do not.
const queryVerifyPhone = `
 INSERT INTO users (telegram_id, first_name, last_name, username, phone_number, phone_verified_at)
 VALUES ($1, $2, $3, $4, $5, now())
 ON CONFLICT (telegram_id) DO UPDATE SET phone_number = EXCLUDED.phone_number, phone_verified_at = now()`
