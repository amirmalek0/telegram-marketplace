package settings

import (
	"encoding/json"
	"fmt"
)

func validateShopDesigns(value string) error {
	var designs map[string]string
	if err := json.Unmarshal([]byte(value), &designs); err != nil || len(designs) != 2 {
		return fmt.Errorf("shop designs must contain categories and products")
	}
	switch designs["categories"] {
	case "ribbon", "grid", "pills", "list", "tiles":
	default:
		return fmt.Errorf("invalid category design")
	}
	switch designs["products"] {
	case "list", "grid", "featured", "compact", "carousel":
	default:
		return fmt.Errorf("invalid product design")
	}
	return nil
}
