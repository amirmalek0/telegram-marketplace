package repository

import (
	"context"
	"telegram-marketplace/internal/core/membership/users/model"
	"telegram-marketplace/pkg/pgconv"
)

func (r *postgresRepository) UpsertProfile(ctx context.Context, u *model.User) (bool, error) {
	var created bool
	err := r.db.QueryRow(ctx, queryUpsertProfile, u.TelegramID, u.FirstName, u.LastName, u.Username, pgconv.Int8Ptr(u.ReferredBy)).Scan(&u.ID, &created)
	return created, err
}

func (r *postgresRepository) PhoneVerified(ctx context.Context, telegramID int64) (bool, error) {
	var verified bool
	err := r.db.QueryRow(ctx, queryPhoneVerified, telegramID).Scan(&verified)
	return verified, err
}

func (r *postgresRepository) VerifyPhone(ctx context.Context, u *model.User) error {
	_, err := r.db.Exec(ctx, queryVerifyPhone, u.TelegramID, u.FirstName, u.LastName, u.Username, u.PhoneNumber)
	return err
}
