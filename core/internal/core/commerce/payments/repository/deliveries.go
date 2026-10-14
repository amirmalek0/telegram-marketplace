package repository

import (
	"context"
	"fmt"
	"time"
)

type DeliveryItem struct {
	Kind      string
	Label     string
	Content   string
	FileName  string
	MimeType  string
	Size      int64
	StorageID string
}
type Delivery struct {
	ID           string
	OrderID      string
	ProductID    string
	ProductTitle string
	Status       string
	Error        *string
	CreatedAt    time.Time
	DeliveredAt  *time.Time
	Items        []DeliveryItem
}

func (r *postgresRepository) ListDeliveries(ctx context.Context, telegramID int64, productID string) ([]Delivery, error) {
	rows, err := r.db.Query(ctx, queryListDeliveries, telegramID, productID)
	if err != nil {
		return nil, fmt.Errorf("payments.repository.ListDeliveries: %w", err)
	}
	defer rows.Close()
	deliveries := []Delivery{}
	for rows.Next() {
		var item Delivery
		if err := rows.Scan(&item.ID, &item.OrderID, &item.ProductID, &item.ProductTitle, &item.Status, &item.Error, &item.CreatedAt, &item.DeliveredAt); err != nil {
			return nil, err
		}
		item.Items = []DeliveryItem{}
		deliveries = append(deliveries, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for index := range deliveries {
		itemRows, err := r.db.Query(ctx, queryListDeliveryItems, deliveries[index].ID)
		if err != nil {
			return nil, err
		}
		for itemRows.Next() {
			var item DeliveryItem
			if err := itemRows.Scan(&item.Kind, &item.Label, &item.Content, &item.FileName, &item.MimeType, &item.Size, &item.StorageID); err != nil {
				itemRows.Close()
				return nil, err
			}
			deliveries[index].Items = append(deliveries[index].Items, item)
		}
		if err := itemRows.Err(); err != nil {
			itemRows.Close()
			return nil, err
		}
		itemRows.Close()
	}
	return deliveries, nil
}
