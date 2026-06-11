package orders

import "context"

type Repository interface {
	Create(ctx context.Context, m *Order) error
}
