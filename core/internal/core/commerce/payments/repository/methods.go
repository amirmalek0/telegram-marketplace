package repository

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"telegram-marketplace/internal/core/commerce/payments/manual"
)

type PaymentMethods struct {
	Stars      bool  `json:"telegram_stars"`
	CardToCard bool  `json:"card_to_card"`
	Revision   int64 `json:"revision"`
}

type MethodRepository interface {
	PaymentMethods(context.Context, string) (*PaymentMethods, error)
	SavePaymentMethods(context.Context, PaymentMethods) (*PaymentMethods, error)
}

type methodQuerier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

// Lock the policy until the checkout transaction commits, so an admin change
// cannot race the creation of a new payment. Existing payments keep their terms.
func readPaymentMethods(ctx context.Context, db methodQuerier, productID string, lock bool) (*PaymentMethods, error) {
	var value PaymentMethods
	query := queryPaymentMethods
	if lock {
		query = queryLockPaymentMethods
	}
	if err := db.QueryRow(ctx, query).Scan(&value.Stars, &value.CardToCard, &value.Revision); err != nil {
		return nil, err
	}
	if productID != "" {
		var override, stars, card bool
		query = queryProductPaymentMethods
		if lock {
			query = queryLockProductPaymentMethods
		}
		if err := db.QueryRow(ctx, query, productID).Scan(&override, &stars, &card); err != nil {
			return nil, ErrCheckoutUnavailable
		}
		if override {
			value.Stars, value.CardToCard = stars, card
		}
	}
	return &value, nil
}

func (r *postgresRepository) PaymentMethods(ctx context.Context, productID string) (*PaymentMethods, error) {
	return readPaymentMethods(ctx, r.db, productID, false)
}

func (r *postgresRepository) SavePaymentMethods(ctx context.Context, value PaymentMethods) (*PaymentMethods, error) {
	err := r.db.QueryRow(ctx, querySavePaymentMethods, value.Stars, value.CardToCard, value.Revision).Scan(&value.Revision)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, manual.ErrConflict
	}
	return &value, err
}

func requirePaymentMethod(ctx context.Context, tx pgx.Tx, productID, method string) error {
	value, err := readPaymentMethods(ctx, tx, productID, true)
	if err != nil {
		return err
	}
	if method == "telegram_stars" && value.Stars || method == "card_to_card" && value.CardToCard {
		return nil
	}
	return ErrCheckoutUnavailable
}
