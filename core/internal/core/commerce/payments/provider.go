package payments

import "context"

type Provider interface {
 CreatePayment(ctx context.Context) error
 VerifyPayment(ctx context.Context) error
 Refund(ctx context.Context) error
}
