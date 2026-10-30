package repository

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"testing"
)

// Used only by disposable-schema integration tests, never the live schema.
func setupMethodTestSchema(t *testing.T, ctx context.Context, db *pgxpool.Pool) {
	t.Helper()
	_, err := db.Exec(ctx, `CREATE TABLE manual_payment_config(id BOOLEAN PRIMARY KEY,stars_enabled BOOLEAN NOT NULL DEFAULT true,value JSONB NOT NULL DEFAULT '{"enabled":false}',revision BIGINT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT now()); INSERT INTO manual_payment_config(id) VALUES(true);
	ALTER TABLE products ADD COLUMN IF NOT EXISTS payment_methods_override BOOLEAN NOT NULL DEFAULT false;
	ALTER TABLE products ADD COLUMN IF NOT EXISTS stars_enabled BOOLEAN NOT NULL DEFAULT true;
	ALTER TABLE products ADD COLUMN IF NOT EXISTS card_to_card_enabled BOOLEAN NOT NULL DEFAULT false`)
	if err != nil {
		t.Fatal(err)
	}
}
