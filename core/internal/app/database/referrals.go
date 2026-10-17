package database

import "telegram-marketplace/internal/core/membership/referrals/model"

// The old referrals table was an id-only stub. Keep legacy rows inert.
var referralMigrations = []string{
	`CREATE TABLE IF NOT EXISTS referral_settings (
        id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
        enabled BOOLEAN NOT NULL DEFAULT false,
        inviter_stars BIGINT NOT NULL DEFAULT 10 CHECK (inviter_stars BETWEEN 0 AND 1000000),
        invitee_stars BIGINT NOT NULL DEFAULT 10 CHECK (invitee_stars BETWEEN 0 AND 1000000),
        reward_trigger TEXT NOT NULL DEFAULT 'bot_open' CHECK (reward_trigger IN ('bot_open','phone_verified','first_purchase')),
        updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
	`INSERT INTO referral_settings(id) VALUES(true) ON CONFLICT DO NOTHING`,
	`CREATE TABLE IF NOT EXISTS referral_codes (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-','')
    )`,
	`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES users(id) ON DELETE SET NULL`,
	`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS invitee_id UUID REFERENCES users(id) ON DELETE SET NULL`,
	`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS invitee_telegram_id BIGINT`,
	`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS inviter_stars BIGINT NOT NULL DEFAULT 0 CHECK (inviter_stars BETWEEN 0 AND 1000000)`,
	`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS invitee_stars BIGINT NOT NULL DEFAULT 0 CHECK (invitee_stars BETWEEN 0 AND 1000000)`,
	`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_trigger TEXT CHECK (reward_trigger IN ('bot_open','phone_verified','first_purchase'))`,
	`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
	`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rewarded_at TIMESTAMPTZ`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_invitee ON referrals(invitee_telegram_id)`,
	`CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id,created_at DESC)`,
	`CREATE INDEX IF NOT EXISTS idx_referrals_pending ON referrals(created_at) WHERE rewarded_at IS NULL AND invitee_id IS NOT NULL`,
	`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES referrals(id)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_referral_reward ON wallet_transactions(referral_id,user_id) WHERE referral_id IS NOT NULL`,
	`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS inviter_message TEXT NOT NULL DEFAULT '` + model.DefaultInviterMessage + `'`,
	`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS invitee_message TEXT NOT NULL DEFAULT '` + model.DefaultInviteeMessage + `'`,
	`CREATE TABLE IF NOT EXISTS referral_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('inviter','invitee')),
        chat_id BIGINT NOT NULL,
        message TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        lease_token UUID,
        lease_until TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(referral_id,role)
    )`,
	`CREATE INDEX IF NOT EXISTS idx_referral_notifications_pending ON referral_notifications(next_attempt_at) WHERE sent_at IS NULL AND failed_at IS NULL`,
}
