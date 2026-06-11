package products

import "context"

type Repository interface {
	Create(ctx context.Context, m *Product) error
}
