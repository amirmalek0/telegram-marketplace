package settings

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"
)

func validateNavigation(value string) error {
	invalid := fmt.Errorf("تنظیمات نوار پایین نامعتبر است؛ ۱ تا ۶ گزینه را نمایش دهید و نام، آیکون و رنگ‌ها را بررسی کنید")
	var fields map[string]json.RawMessage
	if json.Unmarshal([]byte(value), &fields) != nil || len(fields) < 11 || len(fields) > 13 {
		return invalid
	}
	for key := range fields {
		if !widgetContains([]string{"version", "theme", "items", "labels", "autoCompact", "colors", "iconSize", "labelSize", "height", "borderRadius", "itemRadius", "positioning", "geometry"}, key) {
			return invalid
		}
	}
	if !validChromePositioning(fields, false) {
		return invalid
	}
	var data struct {
		Version     int                                   `json:"version"`
		Theme       string                                `json:"theme"`
		Labels      *bool                                 `json:"labels"`
		AutoCompact *bool                                 `json:"autoCompact"`
		Items       []map[string]json.RawMessage          `json:"items"`
		Colors      map[string]map[string]json.RawMessage `json:"colors"`
	}
	if json.Unmarshal([]byte(value), &data) != nil || data.Version != 1 || data.Labels == nil || data.AutoCompact == nil || !widgetContains(navigationThemeNames, data.Theme) || len(data.Items) != 8 || len(data.Colors) != 2 {
		return invalid
	}
	for key, bounds := range map[string][2]float64{"iconSize": {16, 32}, "labelSize": {10, 16}, "height": {56, 92}, "borderRadius": {0, 40}, "itemRadius": {0, 32}} {
		var n *float64
		if json.Unmarshal(fields[key], &n) != nil || n == nil || *n < bounds[0] || *n > bounds[1] {
			return invalid
		}
	}
	for _, mode := range []string{"light", "dark"} {
		colors := data.Colors[mode]
		if len(colors) != 5 {
			return invalid
		}
		for _, key := range []string{"background", "border", "text", "activeBackground", "activeText"} {
			raw, ok := colors[key]
			var color string
			if !ok || string(raw) == "null" || json.Unmarshal(raw, &color) != nil || (color != "" && !widgetColorPattern.MatchString(color)) {
				return invalid
			}
		}
	}
	seen := map[string]bool{}
	visibleCount := 0
	for _, item := range data.Items {
		if len(item) != 6 {
			return invalid
		}
		var page, label, icon, color, activeColor string
		var visible *bool
		for key, dest := range map[string]*string{"page": &page, "label": &label, "icon": &icon, "color": &color, "activeColor": &activeColor} {
			if string(item[key]) == "null" || json.Unmarshal(item[key], dest) != nil {
				return invalid
			}
		}
		if json.Unmarshal(item["visible"], &visible) != nil || visible == nil || seen[page] || !widgetContains([]string{"shop", "wallet", "vip", "tickets", "profile", "orders", "downloads", "notifications"}, page) || strings.TrimSpace(label) == "" || utf8.RuneCountInString(label) > 24 || !validNavigationIcon(icon) || (color != "" && !widgetColorPattern.MatchString(color)) || (activeColor != "" && !widgetColorPattern.MatchString(activeColor)) {
			return invalid
		}
		seen[page] = true
		if *visible {
			visibleCount++
		}
	}
	if visibleCount < 1 || visibleCount > 6 {
		return invalid
	}
	return nil
}
