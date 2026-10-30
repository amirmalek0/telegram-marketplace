package settings

import (
	"encoding/json"
	"os"
	"testing"
)

func TestIconCatalogValidation(t *testing.T) {
	if len(catalogIcons) < 500 {
		t.Fatalf("expected at least 500 icons, got %d", len(catalogIcons))
	}
	raw, err := os.ReadFile("testdata/navigation.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []struct {
		Expected bool
		Value    map[string]interface{}
	}
	if err := json.Unmarshal(raw, &fixtures); err != nil {
		t.Fatal(err)
	}
	var value map[string]interface{}
	for _, fixture := range fixtures {
		if fixture.Expected {
			value = fixture.Value
			break
		}
	}
	if value == nil {
		t.Fatal("missing valid fixture")
	}
	item := value["items"].([]interface{})[0].(map[string]interface{})
	for icon := range catalogIcons {
		item["icon"] = icon
		data, _ := json.Marshal(value)
		if err := validateNavigation(string(data)); err != nil {
			t.Fatalf("%s: %v", icon, err)
		}
	}
	for _, icon := range []string{"lucide:no-such-icon", "https://evil.test/icon.svg", "lucide:../../secret", "__proto__"} {
		item["icon"] = icon
		data, _ := json.Marshal(value)
		if validateNavigation(string(data)) == nil {
			t.Fatalf("accepted invalid icon %s", icon)
		}
	}
	for _, icon := range []string{"shop", "star", "profile", "wallet"} {
		if !validNavigationIcon(icon) {
			t.Fatalf("legacy icon rejected: %s", icon)
		}
	}
}
