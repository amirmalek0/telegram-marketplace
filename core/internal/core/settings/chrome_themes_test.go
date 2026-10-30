package settings

import (
	"encoding/json"
	"os"
	"testing"
)

func TestAllChromeThemes(t *testing.T) {
	header := `{"version":1,"theme":"classic","layout":"standard","sticky":true,"searchScope":"shop","icons":{"theme":true,"notifications":true,"search":true,"title":true},"actionOrder":["theme","notifications","search"]}`
	navigationData, err := os.ReadFile("testdata/navigation.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []struct {
		Expected bool
		Value    json.RawMessage
	}
	if err = json.Unmarshal(navigationData, &fixtures); err != nil {
		t.Fatal(err)
	}
	var navigation string
	for _, fixture := range fixtures {
		if fixture.Expected {
			navigation = string(fixture.Value)
			break
		}
	}
	for _, tc := range []struct {
		name, base string
		themes     []string
		validate   func(string) error
	}{
		{"header", header, headerThemeNames, validateHeader},
		{"navigation", navigation, navigationThemeNames, validateNavigation},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if len(tc.themes) != 80 {
				t.Fatalf("expected 80 themes, got %d", len(tc.themes))
			}
			var value map[string]interface{}
			if err := json.Unmarshal([]byte(tc.base), &value); err != nil {
				t.Fatal(err)
			}
			if tc.name == "header" {
				value["layout"] = "preset"
			}
			seen := map[string]bool{}
			for _, theme := range tc.themes {
				if seen[theme] {
					t.Fatalf("duplicate theme %s", theme)
				}
				seen[theme] = true
				value["theme"] = theme
				data, _ := json.Marshal(value)
				if err := tc.validate(string(data)); err != nil {
					t.Fatalf("%s: %v", theme, err)
				}
			}
			value["theme"] = "unknown-theme"
			data, _ := json.Marshal(value)
			if tc.validate(string(data)) == nil {
				t.Fatal("unknown theme accepted")
			}
		})
	}
}
