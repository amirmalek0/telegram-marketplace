package broadcasts

import "context"

type Repository interface{
 Create(ctx context.Context,m *Model) error
}
