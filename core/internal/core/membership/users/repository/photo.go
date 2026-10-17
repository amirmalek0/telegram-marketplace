package repository

import "context"

func (r *postgresRepository) UpdatePhotoURL(ctx context.Context, id, photoURL string) error {
	_, err := r.db.Exec(ctx, queryUpdatePhotoURL, id, photoURL)
	return err
}
