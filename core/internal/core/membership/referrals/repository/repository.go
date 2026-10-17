package repository

import (
	"context"
	"errors"
	"math"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/membership/referrals/model"
)

type Repository interface {
	Settings(context.Context) (model.Settings, error)
	SaveSettings(context.Context, model.Settings, string) error
	Onboard(context.Context, int64, string, string, string, string) (string, bool, error)
	Summary(context.Context, int64) (*model.Summary, string, error)
	Reward(context.Context, int64) error
	Eligible(context.Context) ([]int64, error)
}

type postgresRepository struct{ db *pgxpool.Pool }

func NewPostgresRepository(db *pgxpool.Pool) Repository { return &postgresRepository{db: db} }
func scanSettings(row pgx.Row) (s model.Settings, err error) {
	err = row.Scan(&s.Enabled, &s.InviterStars, &s.InviteeStars, &s.RewardTrigger, &s.InviterMessage, &s.InviteeMessage)
	return
}
func (r *postgresRepository) Settings(ctx context.Context) (model.Settings, error) {
	return scanSettings(r.db.QueryRow(ctx, querySettings))
}
func (r *postgresRepository) SaveSettings(ctx context.Context, s model.Settings, admin string) error {
	_, err := r.db.Exec(ctx, querySaveSettings, s.Enabled, s.InviterStars, s.InviteeStars, s.RewardTrigger, admin, s.InviterMessage, s.InviteeMessage)
	return err
}

// Creating the account and attributing its first invitation is one transaction.
// An existing account can never attach/change an inviter (including after retries).
func (r *postgresRepository) Onboard(ctx context.Context, tg int64, first, last, username, code string) (string, bool, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", false, err
	}
	defer tx.Rollback(ctx)
	s, err := scanSettings(tx.QueryRow(ctx, queryLockSettings))
	if err != nil {
		return "", false, err
	}
	var id string
	var created bool
	if err = tx.QueryRow(ctx, queryOnboard, tg, first, last, username).Scan(&id, &created); err != nil {
		return "", false, err
	}
	if created && s.Enabled && code != "" {
		if _, err = tx.Exec(ctx, queryAttribute, code, id, tg, s.InviterStars, s.InviteeStars, s.RewardTrigger); err != nil {
			return "", false, err
		}
	}
	return id, created, tx.Commit(ctx)
}

func (r *postgresRepository) Summary(ctx context.Context, tg int64) (*model.Summary, string, error) {
	s, err := r.Settings(ctx)
	if err != nil {
		return nil, "", err
	}
	var id, code string
	if err = r.db.QueryRow(ctx, queryUser, tg).Scan(&id); err != nil {
		return nil, "", err
	}
	if err = r.db.QueryRow(ctx, queryCode, id).Scan(&code); err != nil {
		return nil, "", err
	}
	s.InviterMessage, s.InviteeMessage = "", "" // Admin-only templates are not part of the public summary.
	result := &model.Summary{Settings: s}
	if err = r.db.QueryRow(ctx, querySummary, id).Scan(&result.Total, &result.Rewarded, &result.EarnedStars); err != nil {
		return nil, "", err
	}
	invitation := &model.Invitation{}
	err = r.db.QueryRow(ctx, queryInvitation, id).Scan(&invitation.RewardTrigger, &invitation.InviteeStars, &invitation.RewardedAt)
	if err == nil {
		result.Invitation = invitation
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, "", err
	}
	return result, code, nil
}

func (r *postgresRepository) Eligible(ctx context.Context) ([]int64, error) {
	rows, err := r.db.Query(ctx, queryEligible)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[int64])
}

// The referral, both balances and both ledger entries commit together.
// The row lock plus the ledger unique index protect against retries/concurrency.
func (r *postgresRepository) Reward(ctx context.Context, tg int64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	s, err := scanSettings(tx.QueryRow(ctx, queryLockSettings))
	if err != nil || !s.Enabled {
		return err
	}
	var id, inviter, invitee string
	var a, b int64
	err = tx.QueryRow(ctx, queryLockReward, tg).Scan(&id, &inviter, &invitee, &a, &b)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	type wallet struct {
		ID         string
		Balance    int64
		Banned     bool
		TelegramID int64
		First      string
		Last       string
		Username   string
	}
	rows, err := tx.Query(ctx, queryLockWallets, inviter, invitee)
	if err != nil {
		return err
	}
	wallets, err := pgx.CollectRows(rows, pgx.RowToStructByPos[wallet])
	if err != nil {
		return err
	}
	if len(wallets) != 2 {
		return nil
	}
	var inviterName, inviteeName string
	for _, w := range wallets {
		if w.Banned {
			return nil
		}
		name := model.DisplayName(w.First, w.Last, w.Username)
		if w.ID == inviter {
			inviterName = name
		} else {
			inviteeName = name
		}
	}
	for _, w := range wallets {
		amount, description := a, "پاداش دعوت از دوست"
		if w.ID == invitee {
			amount = b
			description = "هدیه عضویت با دعوت دوست"
		}
		if amount == 0 {
			continue
		}
		if w.Balance > math.MaxInt64-amount {
			return errors.New("referral wallet overflow")
		}
		if _, err = tx.Exec(ctx, queryCredit, w.ID, amount); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, queryLedger, w.ID, amount, w.Balance, w.Balance+amount, description, id); err != nil {
			return err
		}
		role, template := "inviter", s.InviterMessage
		if w.ID == invitee {
			role, template = "invitee", s.InviteeMessage
		}
		message := model.RenderMessage(template, amount, inviterName, inviteeName)
		if _, err = tx.Exec(ctx, queryQueueNotification, id, w.ID, role, w.TelegramID, message); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, queryMarkRewarded, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
