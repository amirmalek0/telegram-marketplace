package repository

import "context"

func (r *postgresRepository) PhoneVerificationRequired(ctx context.Context) (bool, error) {
	var required bool
	err := r.db.QueryRow(ctx, queryPhoneRequirement).Scan(&required)
	return required, err
}

func (r *postgresRepository) SetPhoneVerificationRequired(ctx context.Context, required bool) error {
	return r.db.QueryRow(ctx, queryUpdatePhoneRequirement, required).Scan(&required)
}
