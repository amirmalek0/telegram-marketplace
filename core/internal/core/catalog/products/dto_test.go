package products

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"telegram-marketplace/internal/core/catalog/products/model"
)

func TestPublicProductResponseOmitsDeliveryReferences(t *testing.T) {
	fileID := "internal-file-id"
	messageID := "internal-message-id"
	inventoryID := "internal-inventory-id"
	bundleID := "internal-bundle-id"
	apiID := "internal-api-id"
	product := &model.Product{
		FileID:        &fileID,
		MessageID:     &messageID,
		InventoryID:   &inventoryID,
		BundleID:      &bundleID,
		APIID:         &apiID,
		Repurchasable: true,
	}

	response, err := (&Service{}).toResponse(context.Background(), product, false)
	if err != nil {
		t.Fatalf("toResponse returned an error: %v", err)
	}

	payload, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}

	for _, field := range []string{"file_id", "message_id", "inventory_id", "bundle_id", "api_id"} {
		if strings.Contains(string(payload), `"`+field+`"`) {
			t.Fatalf("public response exposed %s: %s", field, payload)
		}
	}
	if strings.Contains(string(payload), `"price"`) {
		t.Fatalf("public response exposed retired fiat price: %s", payload)
	}
	if !strings.Contains(string(payload), `"repurchasable":true`) {
		t.Fatalf("public response omitted purchase policy: %s", payload)
	}
}

func TestAdminProductResponseIncludesDeliveryReferences(t *testing.T) {
	fileID := "internal-file-id"
	product := &model.Product{FileID: &fileID}

	response, err := (&Service{}).toResponse(context.Background(), product, true)
	if err != nil {
		t.Fatalf("toResponse returned an error: %v", err)
	}
	if response.FileID == nil || *response.FileID != fileID {
		t.Fatalf("admin response did not include file_id")
	}
}
