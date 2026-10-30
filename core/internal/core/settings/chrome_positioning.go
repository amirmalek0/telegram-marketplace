package settings

import "encoding/json"

// Optional, independent fields keep existing version-one documents compatible.
func validChromePositioning(fields map[string]json.RawMessage, header bool) bool {
	positions := []string{"standard", "stack", "inline", "expand", "reverse", "bubbles", "lift", "splitdock", "folders", "launcher", "labelrail"}
	geometries := []string{"default", "plate", "ring", "marker", "lozenge", "bracket"}
	if header {
		positions = []string{"standard", "reversed", "stacked", "centered", "masthead", "utility", "console", "balanced", "banner", "split", "portrait", "ribbon", "compact", "corner"}
		geometries = []string{"default", "tiles", "pills", "rules", "circles", "tags"}
	}
	for key, allowed := range map[string][]string{"positioning": positions, "geometry": geometries} {
		if raw, ok := fields[key]; ok {
			var value string
			if json.Unmarshal(raw, &value) != nil || !widgetContains(allowed, value) {
				return false
			}
		}
	}
	return true
}
