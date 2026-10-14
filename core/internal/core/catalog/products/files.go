package products

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"telegram-marketplace/internal/core/catalog/products/model"
)

// file_id remains a legacy alias for the first file. New clients send file_ids.
func normalizeProductFiles(legacy *string, ids []string) ([]string, *string, error) {
	if ids == nil && legacy != nil {
		ids = []string{*legacy}
	}
	if len(ids) > 100 {
		return nil, nil, fmt.Errorf("%w: at most 100 files are allowed", ErrInvalidDeliveryType)
	}
	seen := make(map[string]bool, len(ids))
	result := make([]string, 0, len(ids))
	for _, id := range ids {
		parsed, err := uuid.Parse(id)
		if err != nil {
			return nil, nil, ErrInvalidFileID
		}
		id = parsed.String()
		if seen[id] {
			return nil, nil, fmt.Errorf("%w: duplicate file", ErrInvalidDeliveryType)
		}
		seen[id] = true
		result = append(result, id)
	}
	if len(result) == 0 {
		if legacy != nil {
			return nil, nil, fmt.Errorf("%w: conflicting file_id and file_ids", ErrInvalidDeliveryType)
		}
		return result, nil, nil
	}
	if legacy != nil {
		parsed, err := uuid.Parse(*legacy)
		if err != nil || parsed.String() != result[0] {
			return nil, nil, fmt.Errorf("%w: file_id must match the first file", ErrInvalidDeliveryType)
		}
	}
	return result, &result[0], nil
}

func (s *Service) validateAdditionalFiles(ctx context.Context, ids []string) error {
	// The first file is validated along with the other delivery references.
	for _, id := range ids[min(1, len(ids)):] {
		exists, err := s.filesRepo.Exists(ctx, id)
		if err != nil {
			return fmt.Errorf("products.service.validateFiles: %w", err)
		}
		if !exists {
			return ErrInvalidFileID
		}
	}
	return nil
}

func clearDeliveryReferences(p *model.Product) {
	p.FileID, p.MessageID, p.InventoryID, p.BundleID, p.APIID = nil, nil, nil, nil, nil
	p.FileIDs = nil
}
