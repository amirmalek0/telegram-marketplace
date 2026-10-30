package repository

const queryLoad = `SELECT revision,messages FROM bot_message_settings WHERE id=true`
const querySave = `UPDATE bot_message_settings SET messages=$1,revision=revision+1,updated_by=$2,updated_at=now() WHERE id=true AND revision=$3 RETURNING revision`
const queryLegacy = `SELECT 'referral.inviter',inviter_message FROM referral_settings WHERE id=true
 UNION ALL SELECT 'referral.invitee',invitee_message FROM referral_settings WHERE id=true
 UNION ALL SELECT 'manual.approved',COALESCE(value->>'approval_message','') FROM manual_payment_config WHERE id=true
 UNION ALL SELECT 'manual.rejected',COALESCE(value->>'rejection_message','') FROM manual_payment_config WHERE id=true`
