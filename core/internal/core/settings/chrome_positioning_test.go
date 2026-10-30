package settings

import (
	"encoding/json"
	"os"
	"testing"
)

func TestIndependentChromePositioning(t *testing.T) {
	header := `{"version":1,"theme":"glass","layout":"standard","sticky":true,"searchScope":"shop","icons":{"theme":true,"notifications":true,"search":true,"title":true},"actionOrder":["search","theme","notifications"]}`
	raw, err := os.ReadFile("testdata/navigation.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []struct {
		Expected bool
		Value    json.RawMessage
	}
	if err = json.Unmarshal(raw, &fixtures); err != nil {
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
		name, base            string
		validate              func(string) error
		positions, geometries []string
	}{
		{"header", header, validateHeader, []string{"standard", "reversed", "stacked", "centered", "masthead", "utility", "console", "balanced", "banner", "split", "portrait", "ribbon", "compact", "corner"}, []string{"default", "tiles", "pills", "rules", "circles", "tags"}},
		{"navigation", navigation, validateNavigation, []string{"standard", "stack", "inline", "expand", "reverse", "bubbles", "lift", "splitdock", "folders", "launcher", "labelrail"}, []string{"default", "plate", "ring", "marker", "lozenge", "bracket"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var value map[string]interface{}
			if err := json.Unmarshal([]byte(tc.base), &value); err != nil {
				t.Fatal(err)
			}
			for _, position := range tc.positions {
				for _, geometry := range tc.geometries {
					value["positioning"] = position
					value["geometry"] = geometry
					data, _ := json.Marshal(value)
					if err := tc.validate(string(data)); err != nil {
						t.Fatalf("%s/%s: %v", position, geometry, err)
					}
				}
			}
			for _, key := range []string{"positioning", "geometry"} {
				old := value[key]
				for _, bad := range []interface{}{nil, 42, "unknown", map[string]string{}} {
					value[key] = bad
					data, _ := json.Marshal(value)
					if tc.validate(string(data)) == nil {
						t.Fatalf("accepted invalid %s", key)
					}
				}
				value[key] = old
			}
			value["unknown"] = true
			data, _ := json.Marshal(value)
			if tc.validate(string(data)) == nil {
				t.Fatal("accepted unknown field")
			}
		})
	}
}
