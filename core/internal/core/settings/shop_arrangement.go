package settings

import (
	"encoding/json"
	"fmt"
)

// Accept legacy order arrays and the new atomic order/visibility configuration.
// Hidden sections keep their position so showing them again restores the order.
func validateShopArrangement(value string) error {
	var order []string
	if err := json.Unmarshal([]byte(value), &order); err == nil && order != nil {
		return validateShopOrder(order)
	}
	var config map[string]json.RawMessage
	if err := json.Unmarshal([]byte(value), &config); err != nil || len(config) != 2 {
		return fmt.Errorf("shop arrangement must contain order and hidden")
	}
	var hidden []string
	if err := json.Unmarshal(config["order"], &order); err != nil {
		return fmt.Errorf("invalid shop order")
	}
	if err := validateShopOrder(order); err != nil {
		return err
	}
	if err := json.Unmarshal(config["hidden"], &hidden); err != nil || hidden == nil || len(hidden) > 2 {
		return fmt.Errorf("hidden must be a list of shop sections")
	}
	seen := make(map[string]bool)
	for _, section := range hidden {
		if (section != "categories" && section != "products") || seen[section] {
			return fmt.Errorf("invalid or duplicate hidden shop section")
		}
		seen[section] = true
	}
	return nil
}

func validateShopOrder(sections []string) error {
	if len(sections) != 2 || !((sections[0] == "categories" && sections[1] == "products") ||
		(sections[0] == "products" && sections[1] == "categories")) {
		return fmt.Errorf("shop arrangement must contain categories and products exactly once")
	}
	return nil
}
