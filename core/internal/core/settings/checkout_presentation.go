package settings

import (
	"encoding/json"
	"fmt"
)

// Presentation only: checkout services still enforce method availability and prices.
func validateCheckoutPresentation(raw string) error {
	var value map[string]string
	if err := json.Unmarshal([]byte(raw), &value); err != nil || len(value) != 3 {
		return fmt.Errorf("invalid checkout presentation")
	}
	for _, purpose := range []string{"product", "vip_plan", "wallet_topup"} {
		switch value[purpose] {
		case "both", "stars_first", "toman_first":
		default:
			return fmt.Errorf("invalid checkout presentation for %s", purpose)
		}
	}
	return nil
}
