package settings

import (
	"encoding/json"
	"fmt"
)

func validateProductFactIcons(raw json.RawMessage) error {
	var fields map[string]json.RawMessage
	if json.Unmarshal(raw, &fields) != nil || fields == nil {
		return fmt.Errorf("invalid product fact icons")
	}
	for key, value := range fields {
		switch key {
		case "category", "delivery", "views", "access", "repurchasable", "published", "demo":
		default:
			return fmt.Errorf("unknown product fact icon")
		}
		var icon string
		if json.Unmarshal(value, &icon) != nil || !validNavigationIcon(icon) {
			return fmt.Errorf("invalid product fact icon")
		}
	}
	return nil
}

// These flags only change presentation, never product access or purchase rules.
func validateProductFacts(raw json.RawMessage) error {
	var fields map[string]json.RawMessage
	if json.Unmarshal(raw, &fields) != nil || fields == nil {
		return fmt.Errorf("invalid product fact visibility")
	}
	for key, value := range fields {
		switch key {
		case "category", "delivery", "views", "access", "repurchasable", "published", "demo":
		default:
			return fmt.Errorf("unknown product fact")
		}
		var visible *bool
		if json.Unmarshal(value, &visible) != nil || visible == nil {
			return fmt.Errorf("product fact visibility must be boolean")
		}
	}
	return nil
}
