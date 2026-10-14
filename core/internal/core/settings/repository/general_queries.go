package repository

const queryPhoneRequirement = `SELECT require_phone_verification FROM settings WHERE id = '00000000-0000-0000-0000-000000000001'`
const queryUpdatePhoneRequirement = `UPDATE settings SET require_phone_verification = $1, updated_at = now() WHERE id = '00000000-0000-0000-0000-000000000001' RETURNING require_phone_verification`
