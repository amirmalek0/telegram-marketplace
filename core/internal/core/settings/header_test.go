package settings

import (
	"context"
	"encoding/json"
	"os"
	"testing"
)

func TestHeaderSettingsSharedContract(t *testing.T) {
	data, err := os.ReadFile("testdata/header_settings.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Name  string
		Valid bool
		Value string
	}
	if err := json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}
	for _, tc := range cases {
		t.Run(tc.Name, func(t *testing.T) {
			repo := &fakeRepository{}
			_, err := NewService(repo).UpdateContent(context.Background(), "appearance.header", tc.Value, "admin")
			if (err == nil) != tc.Valid || (repo.last != nil) != tc.Valid {
				t.Fatalf("expected valid=%v, got %v", tc.Valid, err)
			}
		})
	}
}

func TestHeaderCustomIcons(t *testing.T) {
	base := `{"version":1,"theme":"classic","layout":"standard","sticky":true,"searchScope":"shop","icons":{"theme":true,"notifications":true,"search":true,"title":true},"actionOrder":["theme","notifications","search"]}`
	var settings map[string]interface{}
	if err := json.Unmarshal([]byte(base), &settings); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"title", "themeLight", "themeDark", "notifications", "search", "back"} {
		for _, icon := range []string{"lucide:store", "lucide:bell-ring", "moon"} {
			settings["iconNames"] = map[string]interface{}{key: icon}
			data, _ := json.Marshal(settings)
			if err := validateHeader(string(data)); err != nil {
				t.Fatalf("%s: %s: %v", key, icon, err)
			}
		}
	}
	for _, icons := range []interface{}{nil, []string{}, false, "moon", map[string]interface{}{"other": "moon"}, map[string]interface{}{"search": nil}, map[string]interface{}{"title": ""}, map[string]interface{}{"search": "lucide:missing-icon"}, map[string]interface{}{"back": "https://example.com/icon.svg"}} {
		settings["iconNames"] = icons
		data, _ := json.Marshal(settings)
		if validateHeader(string(data)) == nil {
			t.Fatalf("accepted invalid custom icons: %v", icons)
		}
	}
	settings["logo"] = "/api/v1/miniapp-logo/0c0202be-f760-44ff-8e61-cfbb8e397622.png"
	settings["iconNames"] = map[string]interface{}{"title": "lucide:store"}
	data, _ := json.Marshal(settings)
	if err := validateHeader(string(data)); err != nil {
		t.Fatal(err)
	}
}
