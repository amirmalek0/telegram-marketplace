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
	`CREATE TABLE IF NOT EXISTS users (
		id              TEXT PRIMARY KEY,
		first_name      TEXT NOT NULL DEFAULT '',
		last_name       TEXT NOT NULL DEFAULT '',
		username        TEXT NOT NULL DEFAULT '',
		telegram_id     BIGINT NOT NULL UNIQUE,
		phone_number    TEXT NOT NULL DEFAULT '',
		has_active_plan BOOLEAN NOT NULL DEFAULT false,
		active_plan_id  TEXT,
		wallet_balance  DOUBLE PRECISION NOT NULL DEFAULT 0,
		plan_expire_at  TIMESTAMPTZ,
		referred_by     TEXT,
		is_banned       BOOLEAN NOT NULL DEFAULT false,
		created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS admins (
		id TEXT PRIMARY KEY
	)`,

	`CREATE TABLE IF NOT EXISTS tickets (
		id TEXT PRIMARY KEY
	)`,

	`CREATE TABLE IF NOT EXISTS referrals (
		id TEXT PRIMARY KEY
	)`,

	`CREATE TABLE IF NOT EXISTS broadcasts (
		id TEXT PRIMARY KEY
	)`,

	`CREATE TABLE IF NOT EXISTS vip_plans (
		id TEXT PRIMARY KEY
	)`,

	`CREATE TABLE IF NOT EXISTS categories (
		id TEXT PRIMARY KEY
	)`,

	`CREATE TABLE IF NOT EXISTS products (
		id            TEXT PRIMARY KEY,
	)`,

	`CREATE TABLE IF NOT EXISTS inventory (
		id TEXT PRIMARY KEY
	)`,

	`CREATE TABLE IF NOT EXISTS files (
		id TEXT PRIMARY KEY
	)`,

	`CREATE TABLE IF NOT EXISTS search_index (
		id TEXT PRIMARY KEY
	)`,

	`CREATE TABLE IF NOT EXISTS orders (
		id         TEXT PRIMARY KEY,
	)`,

	`CREATE TABLE IF NOT EXISTS settings (
		id TEXT PRIMARY KEY
	)`,
}
