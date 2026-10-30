package settings

import (
	"encoding/json"
	"fmt"
)

func validateHeader(value string) error {
	invalid := fmt.Errorf("invalid miniapp header settings")
	var fields map[string]json.RawMessage
	if json.Unmarshal([]byte(value), &fields) != nil || len(fields) < 7 || len(fields) > 11 {
		return invalid
	}
	for key := range fields {
		if !widgetContains([]string{"version", "theme", "layout", "sticky", "searchScope", "icons", "actionOrder", "logo", "iconNames", "positioning", "geometry"}, key) {
			return invalid
		}
	}
	if !validChromePositioning(fields, true) {
		return invalid
	}
	if raw, ok := fields["iconNames"]; ok {
		var icons map[string]json.RawMessage
		if string(raw) == "null" || json.Unmarshal(raw, &icons) != nil {
			return invalid
		}
		for key, value := range icons {
			var icon string
			if !widgetContains([]string{"title", "themeLight", "themeDark", "notifications", "search", "back"}, key) || json.Unmarshal(value, &icon) != nil || !validNavigationIcon(icon) {
				return invalid
			}
		}
	}
	if raw, ok := fields["logo"]; ok {
		var logo string
		if string(raw) == "null" || json.Unmarshal(raw, &logo) != nil || (logo != "" && !logoPathPattern.MatchString(logo)) {
			return invalid
		}
	}
	var data struct {
		Version     int              `json:"version"`
		Theme       string           `json:"theme"`
		Layout      string           `json:"layout"`
		Sticky      *bool            `json:"sticky"`
		SearchScope string           `json:"searchScope"`
		Icons       map[string]*bool `json:"icons"`
		ActionOrder []string         `json:"actionOrder"`
	}
	if json.Unmarshal([]byte(value), &data) != nil || data.Version != 1 || data.Sticky == nil ||
		!widgetContains(headerThemeNames, data.Theme) ||
		!widgetContains([]string{"preset", "standard", "reversed", "stacked", "centered"}, data.Layout) ||
		!widgetContains([]string{"shop", "all"}, data.SearchScope) || len(data.Icons) != 4 || len(data.ActionOrder) != 3 {
		return invalid
	}
	for _, key := range []string{"theme", "notifications", "search", "title"} {
		if data.Icons[key] == nil {
			return invalid
		}
	}
	seen := map[string]bool{}
	for _, key := range data.ActionOrder {
		if !widgetContains([]string{"theme", "notifications", "search"}, key) || seen[key] {
			return invalid
		}
		seen[key] = true
	}
	return nil
}
