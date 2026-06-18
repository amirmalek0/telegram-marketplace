package repository

import (
	"context"
	"errors"
	"fmt"
	"telegram-marketplace/internal/core/catalog/products/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested product does not exist.
var ErrNotFound = fmt.Errorf("product not found")

// ErrInvalidCategory is returned when the category_id does not exist.
var ErrInvalidCategory = fmt.Errorf("selected category is not valid")

// Repository defines the data-access contract for the products domain.
type Repository interface {
	Create(ctx context.Context, p *model.Product) error
	GetByID(ctx context.Context, id string) (*model.Product, error)
	List(ctx context.Context, limit, offset int) ([]*model.Product, error)
	Count(ctx context.Context) (int64, error)
	Update(ctx context.Context, p *model.Product) error
	Delete(ctx context.Context, id string) error
	IncrementViews(ctx context.Context, id string) error
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

func (r *postgresRepository) Create(ctx context.Context, p *model.Product) error {
	err := r.db.QueryRow(ctx, queryCreateProduct,
		p.Title, p.Description, p.Price, p.CategoryID, p.DeliveryType,
		p.FileID, p.MessageID, p.InventoryID, p.BundleID, p.APIID,
		p.DemoURL, p.VIPOnly, p.ViewsCount, p.Status, p.CreatedAt,
	).Scan(&p.ID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return ErrInvalidCategory
		}
		return fmt.Errorf("products.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.Product, error) {
	rows, err := r.db.Query(ctx, queryGetProductByID, id)
	if err != nil {
		return nil, fmt.Errorf("products.repository.GetByID: %w", err)
	}
	product, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Product])
	if err != nil {
		return nil, fmt.Errorf("products.repository.GetByID: %w", ErrNotFound)
	}
	return &product, nil
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.Product, error) {
	rows, err := r.db.Query(ctx, queryListProducts, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("products.repository.List: %w", err)
	}
	products, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Product])
	if err != nil {
		return nil, fmt.Errorf("products.repository.List: %w", err)
	}
	result := make([]*model.Product, len(products))
	for i := range products {
		result[i] = &products[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountProducts).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("products.repository.Count: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) Update(ctx context.Context, p *model.Product) error {
	_, err := r.db.Exec(ctx, queryUpdateProduct,
		p.Title, p.Description, p.Price, p.CategoryID, p.DeliveryType,
		p.FileID, p.MessageID, p.InventoryID, p.BundleID, p.APIID,
		p.DemoURL, p.VIPOnly, p.Status, p.ID,
	)
	if err != nil {
		return fmt.Errorf("products.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteProduct, id)
	if err != nil {
		return fmt.Errorf("products.repository.Delete: %w", err)
	}
	return nil
}

func (r *postgresRepository) IncrementViews(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryIncrementViews, id)
	if err != nil {
		return fmt.Errorf("products.repository.IncrementViews: %w", err)
	}
	return nil
}
