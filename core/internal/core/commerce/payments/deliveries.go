package payments

import (
	"context"
	"fmt"

	"telegram-marketplace/pkg/storage"
)

// ListDeliveries returns only paid deliveries belonging to the authenticated
// Telegram user. An optional product ID limits the result for product-page
// access. Internal file/API/inventory identifiers never leave the API.
func (s *Service) ListDeliveries(ctx context.Context, telegramID int64, productID string) ([]DeliveryResponse, error) {
	rows, err := s.db.Query(ctx, `
		SELECT d.id, d.order_id, d.product_id, d.product_title, d.status, d.error, d.created_at, d.delivered_at
		FROM order_deliveries d
		JOIN users u ON u.id = d.user_id
		JOIN orders o ON o.id = d.order_id
		WHERE u.telegram_id = $1 AND o.status = 'paid'
		  AND ($2 = '' OR d.product_id = NULLIF($2, '')::uuid)
		ORDER BY d.created_at DESC`, telegramID, productID)
	if err != nil {
		return nil, fmt.Errorf("payments list deliveries: %w", err)
	}
	defer rows.Close()

	type deliveryRow struct {
		response DeliveryResponse
		id       string
	}
	var deliveries []deliveryRow
	for rows.Next() {
		var current deliveryRow
		if err := rows.Scan(&current.id, &current.response.OrderID, &current.response.ProductID, &current.response.ProductTitle, &current.response.Status, &current.response.Error, &current.response.CreatedAt, &current.response.DeliveredAt); err != nil {
			return nil, err
		}
		current.response.Items = []DeliveryItemResponse{}
		deliveries = append(deliveries, current)
	}

	result := make([]DeliveryResponse, 0, len(deliveries))
	for _, delivery := range deliveries {
		itemRows, err := s.db.Query(ctx, `
			SELECT i.kind, i.label, COALESCE(i.content, ''), COALESCE(f.name, ''),
			       COALESCE(f.mime_type, ''), COALESCE(f.size, 0), COALESCE(f.storage_id, '')
			FROM order_delivery_items i LEFT JOIN files f ON f.id = i.file_id
			WHERE i.delivery_id = $1 AND i.status = 'ready' ORDER BY i.sort_order`, delivery.id)
		if err != nil {
			return nil, err
		}
		response := delivery.response
		for itemRows.Next() {
			var item DeliveryItemResponse
			var storageID string
			if err := itemRows.Scan(&item.Kind, &item.Label, &item.Content, &item.FileName, &item.MimeType, &item.Size, &storageID); err != nil {
				itemRows.Close()
				return nil, err
			}
			if storageID != "" {
				url, err := s.fileStorage.PresignedURL(ctx, storageID, storage.PresignedURLTTL)
				if err != nil {
					itemRows.Close()
					return nil, fmt.Errorf("payments delivery URL: %w", err)
				}
				item.DownloadURL = url
			}
			response.Items = append(response.Items, item)
		}
		itemRows.Close()
		result = append(result, response)
	}
	return result, nil
}
