package database

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Migrate runs all CREATE TABLE IF NOT EXISTS statements.
// It is idempotent and safe to call on every startup.
func Migrate(ctx context.Context, db *pgxpool.Pool) {
	for i, stmt := range migrations {
		if _, err := db.Exec(ctx, stmt); err != nil {
			log.Fatalf("migration %d failed: %v", i+1, err)
		}
	}
	log.Println("database: migrations applied")
}

var migrations = []string{
	`CREATE EXTENSION IF NOT EXISTS pgcrypto`,

	`CREATE TABLE IF NOT EXISTS users (
		id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		first_name      TEXT NOT NULL DEFAULT '',
		last_name       TEXT NOT NULL DEFAULT '',
		username        TEXT NOT NULL DEFAULT '',
		telegram_id     BIGINT NOT NULL UNIQUE,
		phone_number    TEXT NOT NULL DEFAULT '',
		has_active_plan BOOLEAN NOT NULL DEFAULT false,
		active_plan_id  TEXT,
		wallet_balance  DOUBLE PRECISION NOT NULL DEFAULT 0,
		plan_expire_at  TIMESTAMPTZ,
		referred_by     BIGINT,
		is_banned       BOOLEAN NOT NULL DEFAULT false,
		created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS admins (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS tickets (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS referrals (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS broadcasts (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS vip_plans (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS categories (
		id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		title      TEXT        NOT NULL,
		slug       TEXT        NOT NULL UNIQUE,
		storage_id TEXT        NOT NULL DEFAULT '',
		active     BOOLEAN     NOT NULL DEFAULT true,
		sort_order INTEGER     NOT NULL DEFAULT 0,
		created_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS files (
		id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		name        TEXT        NOT NULL,
		size        BIGINT      NOT NULL,
		mime_type   TEXT        NOT NULL,
		storage_id  TEXT        NOT NULL,
		created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS delivery_messages (
		id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		content     TEXT        NOT NULL,
		created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS inventories (
		id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		name        TEXT        NOT NULL,
		created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS inventory_items (
		id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		inventory_id  UUID        NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
		value         TEXT        NOT NULL,
		status        TEXT        NOT NULL DEFAULT 'available'
		                          CHECK (status IN ('available', 'sold')),
		sold_at       TIMESTAMPTZ,
		order_id      UUID,
		user_id       UUID,
		created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`CREATE INDEX IF NOT EXISTS idx_inventory_items_inventory_id ON inventory_items(inventory_id)`,
	`CREATE INDEX IF NOT EXISTS idx_inventory_items_status       ON inventory_items(status)`,

	`CREATE TABLE IF NOT EXISTS apis (
		id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		url           TEXT NOT NULL,
		method        TEXT NOT NULL CHECK (method IN ('GET', 'POST')),
		body          TEXT,
		response_path TEXT,
		created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS api_headers (
		id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		api_id  UUID NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
		key     TEXT NOT NULL,
		value   TEXT NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS idx_api_headers_api_id ON api_headers(api_id)`,

	`CREATE TABLE IF NOT EXISTS bundles (
		id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		file_id       UUID REFERENCES files(id),
		message_id    UUID REFERENCES delivery_messages(id),
		inventory_id  UUID REFERENCES inventories(id),
		created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
		CONSTRAINT bundle_at_least_one
			CHECK (file_id IS NOT NULL OR message_id IS NOT NULL OR inventory_id IS NOT NULL)
	)`,

	`CREATE TABLE IF NOT EXISTS products (
		id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		title         TEXT        NOT NULL,
		description   TEXT        NOT NULL DEFAULT '',
		price         DOUBLE PRECISION NOT NULL,
		category_id   UUID        NOT NULL REFERENCES categories(id),
		delivery_type TEXT        NOT NULL
		                          CHECK (delivery_type IN ('file','message','inventory','bundle','api')),
		file_id       UUID        REFERENCES files(id),
		message_id    UUID        REFERENCES delivery_messages(id),
		inventory_id  UUID        REFERENCES inventories(id),
		bundle_id     UUID        REFERENCES bundles(id),
		api_id        UUID        REFERENCES apis(id),
		demo_url      TEXT,
		vip_only      BOOLEAN     NOT NULL DEFAULT false,
		views_count   INTEGER     NOT NULL DEFAULT 0,
		status        TEXT        NOT NULL DEFAULT 'active'
		                          CHECK (status IN ('active','draft','archived')),
		created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`,
	`CREATE INDEX IF NOT EXISTS idx_products_status       ON products(status)`,

	`CREATE TABLE IF NOT EXISTS search_index (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS orders (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS settings (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,
}
