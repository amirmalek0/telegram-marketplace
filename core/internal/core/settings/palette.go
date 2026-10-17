package settings

import (
	"encoding/json"
	"fmt"
	"regexp"
)

var paletteColorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

// Palettes share the published content store, but are structured data, never CSS.
// A single content entry keeps both modes atomic without changing text overrides.
func validatePalette(value string) error {
	var palette map[string]map[string]string
	if err := json.Unmarshal([]byte(value), &palette); err != nil || len(palette) != 2 {
		return fmt.Errorf("palette must contain light and dark colors")
	}
	for _, mode := range []string{"light", "dark"} {
		colors := palette[mode]
		if len(colors) != 6 {
			return fmt.Errorf("palette %s must contain all six colors", mode)
		}
		for _, key := range []string{"accent", "background", "surface", "text", "secondary", "navigation"} {
			if !paletteColorPattern.MatchString(colors[key]) {
				return fmt.Errorf("palette %s.%s must be a six-digit hex color", mode, key)
			}
		}
	}
	return nil
}
