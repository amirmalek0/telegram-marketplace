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
		id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		username      TEXT        NOT NULL UNIQUE,
		password_hash TEXT        NOT NULL,
		is_active     BOOLEAN     NOT NULL DEFAULT true,
		last_login_at TIMESTAMPTZ,
		created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS ticket_categories (
		id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		name       TEXT        NOT NULL UNIQUE,
		created_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS tickets (
		id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		subject         TEXT NOT NULL,
		status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'resolved')),
		priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
		category        TEXT NOT NULL DEFAULT 'general' REFERENCES ticket_categories(name),
		created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
		closed_at       TIMESTAMPTZ,
		last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id)`,
	`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`,
	`CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC)`,
	`CREATE INDEX IF NOT EXISTS idx_tickets_last_message_at ON tickets(last_message_at DESC)`,

	`CREATE TABLE IF NOT EXISTS ticket_messages (
		id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
		sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
		sender_id   UUID NOT NULL,
		message     TEXT NOT NULL,
		created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id)`,
	`CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at)`,

	`CREATE TABLE IF NOT EXISTS referrals (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS broadcasts (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS vip_plans (
		id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		title      TEXT NOT NULL,
		price      DOUBLE PRECISION NOT NULL CHECK (price >= 0),
		duration   INT NOT NULL CHECK (duration > 0),
		status     TEXT NOT NULL DEFAULT 'active'
		           CHECK (status IN ('active', 'inactive')),
		created_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	// Upgrade path for DBs that already have the id-only vip_plans stub.
	`ALTER TABLE vip_plans ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT ''`,
	`ALTER TABLE vip_plans ADD COLUMN IF NOT EXISTS price DOUBLE PRECISION NOT NULL DEFAULT 0`,
	`ALTER TABLE vip_plans ADD COLUMN IF NOT EXISTS duration INT NOT NULL DEFAULT 30`,
	`ALTER TABLE vip_plans ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,
	`ALTER TABLE vip_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,

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
		name          TEXT NOT NULL DEFAULT '',
		url           TEXT NOT NULL,
		method        TEXT NOT NULL CHECK (method IN ('GET', 'POST')),
		body          TEXT,
		response_path TEXT,
		headers       JSONB NOT NULL DEFAULT '[]'::jsonb,
		created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS bundles (
		id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name          TEXT NOT NULL DEFAULT '',
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
		image_storage_id TEXT      NOT NULL DEFAULT '',
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
	// Upgrade path for databases created before product images were introduced.
	`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_storage_id TEXT NOT NULL DEFAULT ''`,
	`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`,
	`CREATE INDEX IF NOT EXISTS idx_products_status       ON products(status)`,

	`CREATE TABLE IF NOT EXISTS search_index (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS coupons (
		id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		code           TEXT NOT NULL UNIQUE,
		discount_type  TEXT NOT NULL CHECK (discount_type IN ('static', 'percentage')),
		discount_value DOUBLE PRECISION NOT NULL CHECK (discount_value > 0),
		usage_limit    INTEGER NOT NULL DEFAULT 0,
		usage_count    INTEGER NOT NULL DEFAULT 0,
		expires_at     TIMESTAMPTZ,
		is_active      BOOLEAN NOT NULL DEFAULT true,
		product_ids    JSONB DEFAULT '[]'::jsonb,
		created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)`,
	`CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active)`,
	`CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at)`,

	`CREATE TABLE IF NOT EXISTS orders (
		id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		product_id      UUID NOT NULL REFERENCES products(id),
		quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
		coupon_id       UUID REFERENCES coupons(id),
		amount          DOUBLE PRECISION NOT NULL CHECK (amount >= 0),
		discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
		payment_method  TEXT,
		status          TEXT NOT NULL DEFAULT 'pending'
		                          CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
		paid_at         TIMESTAMPTZ,
		created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`,
	`CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id)`,
	`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
	`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`,

	`CREATE TABLE IF NOT EXISTS payments (
		id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
		provider        TEXT NOT NULL,
		gateway_trx_id  TEXT,
		amount          DOUBLE PRECISION NOT NULL CHECK (amount > 0),
		status          TEXT NOT NULL DEFAULT 'pending'
		                          CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
		callback_data   JSONB,
		created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)`,
	`CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider)`,
	`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
	`CREATE INDEX IF NOT EXISTS idx_payments_gateway_trx_id ON payments(gateway_trx_id)`,

	`CREATE TABLE IF NOT EXISTS settings (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS seed_markers (
		seed_name  TEXT        PRIMARY KEY,
		created_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS wallet_transactions (
		id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		type            TEXT NOT NULL CHECK (type IN ('purchase','reward','topup','refund','admin_adjust')),
		amount          DOUBLE PRECISION NOT NULL CHECK (amount > 0),
		balance_before  DOUBLE PRECISION NOT NULL,
		balance_after   DOUBLE PRECISION NOT NULL,
		description     TEXT NOT NULL DEFAULT '',
		created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id)`,
	`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type)`,
	`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC)`,
}
