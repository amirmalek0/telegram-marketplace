package database

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Migrate runs all CREATE TABLE IF NOT EXISTS statements.
// It is idempotent and safe to call on every startup.
func Migrate(ctx context.Context, db *pgxpool.Pool) {
	conn, err := db.Acquire(ctx)
	if err != nil {
		log.Fatalf("migration lock connection failed: %v", err)
	}
	defer conn.Release()

	// API and bot start together and both apply the shared schema. A
	// session-scoped advisory lock serializes them so DROP/ADD upgrade steps
	// cannot race and force one service to restart.
	const migrationLockID int64 = 742091843
	if _, err := conn.Exec(ctx, `SELECT pg_advisory_lock($1)`, migrationLockID); err != nil {
		log.Fatalf("migration lock failed: %v", err)
	}
	defer func() {
		if _, err := conn.Exec(context.Background(), `SELECT pg_advisory_unlock($1)`, migrationLockID); err != nil {
			log.Printf("migration unlock failed: %v", err)
		}
	}()

	for i, stmt := range migrations {
		if _, err := conn.Exec(ctx, stmt); err != nil {
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
		category        TEXT NOT NULL DEFAULT 'general' REFERENCES ticket_categories(name) ON UPDATE CASCADE ON DELETE RESTRICT,
		created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
		closed_at       TIMESTAMPTZ,
		last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	// Upgrade path for databases that used a fixed English-only category check.
	// Preserve any category already referenced by a ticket before replacing that
	// check with the dynamic ticket_categories foreign key.
	`INSERT INTO ticket_categories (id, name, created_at)
	 SELECT gen_random_uuid(), used.category, now()
	 FROM (SELECT DISTINCT category FROM tickets WHERE category IS NOT NULL) AS used
	 ON CONFLICT (name) DO NOTHING`,
	`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_category_check`,
	`DO $$
	 BEGIN
		IF NOT EXISTS (
			SELECT 1
			FROM pg_constraint
			WHERE conrelid = 'tickets'::regclass
			  AND conname = 'tickets_category_fkey'
		) THEN
			ALTER TABLE tickets
				ADD CONSTRAINT tickets_category_fkey
				FOREIGN KEY (category)
				REFERENCES ticket_categories(name)
				ON UPDATE CASCADE
				ON DELETE RESTRICT;
		END IF;
	 END
	 $$`,
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
		stars_price   BIGINT      NOT NULL DEFAULT 0 CHECK (stars_price >= 0),
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
	`ALTER TABLE products ADD COLUMN IF NOT EXISTS stars_price BIGINT NOT NULL DEFAULT 0`,
	`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stars_price_check`,
	`DO $$
	 BEGIN
		BEGIN
			ALTER TABLE products ADD CONSTRAINT products_stars_price_check CHECK (stars_price >= 0);
		EXCEPTION WHEN duplicate_object THEN
			NULL;
		END;
	 END
	 $$`,
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
		id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
		method                  TEXT NOT NULL,
		currency                TEXT NOT NULL,
		amount_minor            BIGINT NOT NULL,
		checkout_reference      TEXT NOT NULL UNIQUE,
		external_transaction_id TEXT,
		provider_transaction_id TEXT,
		status                  TEXT NOT NULL DEFAULT 'pending'
		                                CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
		provider_data           JSONB,
		created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
		paid_at                 TIMESTAMPTZ,
		refunded_at             TIMESTAMPTZ,
		CONSTRAINT payments_amount_minor_check CHECK (amount_minor > 0)
	)`,
	// Upgrade path from the unfinished gateway schema. Provider-specific legacy
	// columns remain nullable for audit/history, while new code uses this neutral
	// shape so another processor can be added without another table redesign.
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS method TEXT`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_minor BIGINT`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_reference TEXT`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_transaction_id TEXT`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_data JSONB`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false`,
	`UPDATE payments
	 SET is_test = true
	 WHERE external_transaction_id LIKE 'test:%'
	    OR COALESCE(provider_data, '{}'::jsonb) @> '{"simulated":true}'::jsonb`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,
	`ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ`,
	`DO $$
	 BEGIN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'provider'
		) THEN
			EXECUTE 'UPDATE payments SET method = provider WHERE (method IS NULL OR method = '''') AND provider IS NOT NULL AND provider <> ''''';
			EXECUTE 'UPDATE payments SET currency = CASE WHEN provider = ''telegram_stars'' THEN ''XTR'' ELSE ''IRR'' END WHERE provider IS NOT NULL AND provider <> ''''';
			EXECUTE 'ALTER TABLE payments ALTER COLUMN provider DROP NOT NULL';
		END IF;
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'amount'
		) THEN
			EXECUTE 'UPDATE payments SET amount_minor = GREATEST(1, ROUND(amount)::BIGINT) WHERE amount_minor IS NULL';
			EXECUTE 'ALTER TABLE payments ALTER COLUMN amount DROP NOT NULL';
		END IF;
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'gateway_trx_id'
		) THEN
			EXECUTE 'UPDATE payments SET external_transaction_id = gateway_trx_id WHERE external_transaction_id IS NULL AND gateway_trx_id IS NOT NULL';
		END IF;
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'callback_data'
		) THEN
			EXECUTE 'UPDATE payments SET provider_data = callback_data WHERE provider_data IS NULL AND callback_data IS NOT NULL';
		END IF;
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'stars_amount'
		) THEN
			EXECUTE 'UPDATE payments SET method = ''telegram_stars'' WHERE method IS NULL OR method = ''''';
			EXECUTE 'UPDATE payments SET currency = ''XTR'' WHERE currency IS NULL OR currency = ''''';
			EXECUTE 'UPDATE payments SET amount_minor = stars_amount WHERE amount_minor IS NULL AND stars_amount IS NOT NULL';
			EXECUTE 'ALTER TABLE payments ALTER COLUMN stars_amount DROP NOT NULL';
		END IF;
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'invoice_payload'
		) THEN
			EXECUTE 'UPDATE payments SET checkout_reference = invoice_payload WHERE (checkout_reference IS NULL OR checkout_reference = '''') AND invoice_payload IS NOT NULL AND invoice_payload <> ''''';
			EXECUTE 'ALTER TABLE payments ALTER COLUMN invoice_payload DROP NOT NULL';
		END IF;
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'telegram_payment_charge_id'
		) THEN
			EXECUTE 'UPDATE payments SET external_transaction_id = telegram_payment_charge_id WHERE external_transaction_id IS NULL AND telegram_payment_charge_id IS NOT NULL';
		END IF;
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'provider_payment_charge_id'
		) THEN
			EXECUTE 'UPDATE payments SET provider_transaction_id = provider_payment_charge_id WHERE provider_transaction_id IS NULL AND provider_payment_charge_id IS NOT NULL';
		END IF;
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'successful_payment'
		) THEN
			EXECUTE 'UPDATE payments SET provider_data = successful_payment WHERE provider_data IS NULL AND successful_payment IS NOT NULL';
		END IF;
	 END
	 $$`,
	`UPDATE payments SET method = 'legacy' WHERE method IS NULL OR method = ''`,
	`ALTER TABLE payments ALTER COLUMN method SET NOT NULL`,
	`UPDATE payments SET currency = CASE WHEN method = 'telegram_stars' THEN 'XTR' ELSE 'IRR' END WHERE currency IS NULL OR currency = ''`,
	`ALTER TABLE payments ALTER COLUMN currency SET NOT NULL`,
	`ALTER TABLE payments ALTER COLUMN currency DROP DEFAULT`,
	`UPDATE payments SET amount_minor = 1 WHERE amount_minor IS NULL`,
	`ALTER TABLE payments ALTER COLUMN amount_minor SET NOT NULL`,
	`UPDATE payments SET checkout_reference = 'legacy:' || id::text WHERE checkout_reference IS NULL OR checkout_reference = ''`,
	`ALTER TABLE payments ALTER COLUMN checkout_reference SET NOT NULL`,
	`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_currency_check`,
	`DO $$
	 BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint
			WHERE conrelid = 'payments'::regclass AND conname = 'payments_amount_minor_check'
		) THEN
			ALTER TABLE payments ADD CONSTRAINT payments_amount_minor_check CHECK (amount_minor > 0);
		END IF;
	 END
	 $$`,
	`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)`,
	`CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method)`,
	`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_checkout_reference ON payments(checkout_reference)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_external_transaction ON payments(method, external_transaction_id) WHERE external_transaction_id IS NOT NULL`,

	`CREATE TABLE IF NOT EXISTS order_deliveries (
		id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		order_id     UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
		user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		product_id   UUID NOT NULL REFERENCES products(id),
		product_title TEXT NOT NULL,
		status       TEXT NOT NULL DEFAULT 'awaiting_payment'
		                    CHECK (status IN ('awaiting_payment','processing','delivered','failed')),
		error        TEXT,
		created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
		delivered_at TIMESTAMPTZ
	)`,
	`CREATE INDEX IF NOT EXISTS idx_order_deliveries_user_id ON order_deliveries(user_id, created_at DESC)`,
	`CREATE INDEX IF NOT EXISTS idx_order_deliveries_status ON order_deliveries(status)`,

	`CREATE TABLE IF NOT EXISTS order_delivery_items (
		id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		delivery_id  UUID NOT NULL REFERENCES order_deliveries(id) ON DELETE CASCADE,
		kind         TEXT NOT NULL CHECK (kind IN ('file','message','inventory','api')),
		label        TEXT NOT NULL DEFAULT '',
		file_id      UUID REFERENCES files(id),
		api_id       UUID REFERENCES apis(id),
		content      TEXT,
		status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
		sort_order   INTEGER NOT NULL DEFAULT 0,
		error        TEXT,
		created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`CREATE INDEX IF NOT EXISTS idx_order_delivery_items_delivery_id ON order_delivery_items(delivery_id, sort_order)`,

	// Inventory values are reserved while an invoice is open and become sold
	// only after Telegram sends a successful_payment update.
	`ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_status_check`,
	`ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_status_check CHECK (status IN ('available','reserved','sold'))`,
	`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ`,

	`CREATE TABLE IF NOT EXISTS settings (
		id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		payment_test_mode BOOLEAN NOT NULL DEFAULT false,
		updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_test_mode BOOLEAN NOT NULL DEFAULT false`,
	`ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
	`INSERT INTO settings (id, payment_test_mode, updated_at)
	 VALUES ('00000000-0000-0000-0000-000000000001', false, now())
	 ON CONFLICT (id) DO NOTHING`,

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
