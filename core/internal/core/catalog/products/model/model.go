package model

import "time"

// DeliveryType represents the type of delivery for a product.
type DeliveryType string

// Delivery type constants.
const (
	DeliveryTypeFile      DeliveryType = "file"
	DeliveryTypeMessage   DeliveryType = "message"
	DeliveryTypeInventory DeliveryType = "inventory"
	DeliveryTypeBundle    DeliveryType = "bundle"
	DeliveryTypeAPI       DeliveryType = "api"
)

// ValidDeliveryTypes returns all valid delivery types.
func ValidDeliveryTypes() []DeliveryType {
	return []DeliveryType{
		DeliveryTypeFile,
		DeliveryTypeMessage,
		DeliveryTypeInventory,
		DeliveryTypeBundle,
		DeliveryTypeAPI,
	}
}

// IsValid checks if the delivery type is valid.
func (dt DeliveryType) IsValid() bool {
	for _, valid := range ValidDeliveryTypes() {
		if dt == valid {
			return true
		}
	}
	return false
}

// Product represents a product in the catalog.
type Product struct {
	ID                     string       `db:"id"`
	Title                  string       `db:"title"`
	Description            string       `db:"description"`
	StarsPrice             int64        `db:"stars_price"`
	TomanPrice             int64        `db:"toman_price"`
	PaymentMethodsOverride bool         `db:"payment_methods_override"`
	StarsEnabled           bool         `db:"stars_enabled"`
	CardToCardEnabled      bool         `db:"card_to_card_enabled"`
	CategoryID             string       `db:"category_id"`
	ImageStorageID         string       `db:"image_storage_id"`
	DeliveryType           DeliveryType `db:"delivery_type"`
	FileID                 *string      `db:"file_id"`
	FileIDs                []string     `db:"file_ids"`
	MessageID              *string      `db:"message_id"`
	InventoryID            *string      `db:"inventory_id"`
	BundleID               *string      `db:"bundle_id"`
	APIID                  *string      `db:"api_id"`
	DemoURL                *string      `db:"demo_url"`
	VIPOnly                bool         `db:"vip_only"`
	Repurchasable          bool         `db:"repurchasable"`
	ViewsCount             int          `db:"views_count"`
	Status                 string       `db:"status"`
	CreatedAt              time.Time    `db:"created_at"`
}
