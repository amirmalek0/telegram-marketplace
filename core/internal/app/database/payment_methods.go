package database

var paymentMethodMigrations = []string{
	`ALTER TABLE manual_payment_config ADD COLUMN IF NOT EXISTS stars_enabled BOOLEAN NOT NULL DEFAULT true`,
	`ALTER TABLE products ADD COLUMN IF NOT EXISTS payment_methods_override BOOLEAN NOT NULL DEFAULT false`,
	`ALTER TABLE products ADD COLUMN IF NOT EXISTS stars_enabled BOOLEAN NOT NULL DEFAULT true`,
	`ALTER TABLE products ADD COLUMN IF NOT EXISTS card_to_card_enabled BOOLEAN NOT NULL DEFAULT false`,
}
