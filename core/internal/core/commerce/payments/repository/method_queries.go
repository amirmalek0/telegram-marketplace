package repository

const queryPaymentMethods = `SELECT stars_enabled,COALESCE((value->>'enabled')::boolean,false),revision FROM manual_payment_config WHERE id=true`
const queryLockPaymentMethods = queryPaymentMethods + ` FOR SHARE`
const querySavePaymentMethods = `UPDATE manual_payment_config SET stars_enabled=$1,value=jsonb_set(value,'{enabled}',to_jsonb($2::boolean)),revision=revision+1,updated_at=now() WHERE id=true AND revision=$3 RETURNING revision`
const queryProductPaymentMethods = `SELECT payment_methods_override,stars_enabled,card_to_card_enabled FROM products WHERE id=$1 AND status='active'`
const queryLockProductPaymentMethods = queryProductPaymentMethods + ` FOR SHARE`
