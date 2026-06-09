package users

import "context"

type Repository interface {
	Create(ctx context.Context, m *User) error
}
