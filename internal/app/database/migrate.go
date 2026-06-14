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

	`CREATE TABLE IF NOT EXISTS products (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS inventory (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

	`CREATE TABLE IF NOT EXISTS files (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid()
	)`,

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
