package payments

import (
	"context"
	"fmt"

	"telegram-marketplace/pkg/storage"
)

// ListDeliveries maps repository delivery records to public responses and
// resolves short-lived download URLs without exposing storage identifiers.
func (s *Service) ListDeliveries(ctx context.Context, telegramID int64, productID string) ([]DeliveryResponse, error) {
	records, err := s.repo.ListDeliveries(ctx, telegramID, productID)
	if err != nil {
		return nil, err
	}
	result := make([]DeliveryResponse, 0, len(records))
	for _, record := range records {
		response := DeliveryResponse{OrderID: record.OrderID, ProductID: record.ProductID, ProductTitle: record.ProductTitle, Status: record.Status, Error: record.Error, CreatedAt: record.CreatedAt, DeliveredAt: record.DeliveredAt, Items: []DeliveryItemResponse{}}
		for _, recordItem := range record.Items {
			item := DeliveryItemResponse{Kind: recordItem.Kind, Label: recordItem.Label, Content: recordItem.Content, FileName: recordItem.FileName, MimeType: recordItem.MimeType, Size: recordItem.Size}
			if recordItem.StorageID != "" {
				url, urlErr := s.fileStorage.PresignedURL(ctx, recordItem.StorageID, storage.PresignedURLTTL)
				if urlErr != nil {
					return nil, fmt.Errorf("payments delivery URL: %w", urlErr)
				}
				item.DownloadURL = url
			}
			response.Items = append(response.Items, item)
		}
		result = append(result, response)
	}
	return result, nil
}
