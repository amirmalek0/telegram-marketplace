package repository

import (
	"context"
	"errors"
	"fmt"
	"telegram-marketplace/internal/core/catalog/files/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrReferenced = errors.New("فایل به محصول، بسته یا خرید ثبت‌شده متصل است و قابل حذف نیست")

// ErrNotFound is returned when a requested file does not exist.
var ErrNotFound = fmt.Errorf("file not found")

// Repository defines the data-access contract for the files domain.
type Repository interface {
	Create(ctx context.Context, f *model.File) error
	GetByID(ctx context.Context, id string) (*model.File, error)
	List(ctx context.Context, limit, offset int) ([]*model.File, error)
	Count(ctx context.Context) (int64, error)
	Delete(ctx context.Context, id string) error
	Exists(ctx context.Context, id string) (bool, error)
}

// postgresRepository is the Postgres implementation of Repository.
type postgresRepository struct {
	db *pgxpool.Pool
}

// NewPostgresRepository constructs a Postgres-backed Repository.
func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

// compile-time interface check
var _ Repository = (*postgresRepository)(nil)

func (r *postgresRepository) Create(ctx context.Context, f *model.File) error {
	err := r.db.QueryRow(ctx, queryCreateFile,
		f.Name, f.Size, f.MimeType, f.StorageID, f.CreatedAt,
	).Scan(&f.ID)
	if err != nil {
		return fmt.Errorf("files.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.File, error) {
	rows, err := r.db.Query(ctx, queryGetFileByID, id)
	if err != nil {
		return nil, fmt.Errorf("files.repository.GetByID: %w", err)
	}
	file, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.File])
	if err != nil {
		return nil, fmt.Errorf("files.repository.GetByID: %w", ErrNotFound)
	}
	return &file, nil
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.File, error) {
	rows, err := r.db.Query(ctx, queryListFiles, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("files.repository.List: %w", err)
	}
	files, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.File])
	if err != nil {
		return nil, fmt.Errorf("files.repository.List: %w", err)
	}
	result := make([]*model.File, len(files))
	for i := range files {
		result[i] = &files[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountFiles).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("files.repository.Count: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteFile, id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return ErrReferenced
		}
		return fmt.Errorf("files.repository.Delete: %w", err)
	}
	return nil
}

func (r *postgresRepository) Exists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, queryFileExists, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("files.repository.Exists: %w", err)
	}
	return exists, nil
}
