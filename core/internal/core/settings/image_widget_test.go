package settings

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func imageLayout(styles map[string]any, src, css string) map[string]any {
	return map[string]any{"id": "widget-12345678", "type": "media.image", "visible": true, "design": "plain", "image": map[string]any{"src": src, "alt": "تصویر", "styles": styles, "css": css}}
}

func TestImageWidgetValidation(t *testing.T) {
	valid := func(item map[string]any) bool {
		value, _ := json.Marshal(map[string]any{"version": 1, "sections": []any{item}})
		_, err := NewService(&fakeRepository{}).UpdateContent(context.Background(), "appearance.page.shop", string(value), "admin")
		return err == nil
	}
	for key, limits := range imageNumberRules {
		for _, n := range limits {
			if !valid(imageLayout(map[string]any{key: n}, "", "")) {
				t.Fatalf("valid limit rejected: %s %v", key, n)
			}
		}
		for _, n := range []any{limits[0] - 1, limits[1] + 1, nil, "10"} {
			if valid(imageLayout(map[string]any{key: n}, "", "")) {
				t.Fatalf("invalid accepted: %s %v", key, n)
			}
		}
	}
	for key, options := range imageEnumRules {
		for _, option := range options {
			if !valid(imageLayout(map[string]any{key: option}, "", "")) {
				t.Fatal(key, option)
			}
		}
		if valid(imageLayout(map[string]any{key: "invalid"}, "", "")) {
			t.Fatal("invalid enum accepted")
		}
	}
	for _, src := range []string{"https://example.com/a.png", "/api/v1/miniapp-images/../file", "data:image/svg+xml,test"} {
		if valid(imageLayout(map[string]any{}, src, "")) {
			t.Fatal("unsafe src accepted")
		}
	}
	if !valid(imageLayout(map[string]any{}, "/api/v1/miniapp-images/0c0202be-f760-44ff-8e61-cfbb8e397622.png", ".widget { border-radius:20px; }")) {
		t.Fatal("valid asset rejected")
	}
	if valid(imageLayout(map[string]any{}, "", ".widget{background:url(https://evil.test)}")) {
		t.Fatal("unsafe CSS accepted")
	}
	item := imageLayout(map[string]any{}, "", "")
	item["image"].(map[string]any)["alt"] = strings.Repeat("a", 501)
	if valid(item) {
		t.Fatal("long alt accepted")
	}
}

func TestImagesOnEveryPageAndDuplicateIDs(t *testing.T) {
	for page := range layoutPages {
		sections := []any{imageLayout(map[string]any{}, "", "")}
		for kind, rule := range pageSectionRules {
			if rule.page == page && rule.required {
				sections = append(sections, map[string]any{"type": kind, "visible": true, "design": "original"})
			}
		}
		check := func(expected bool) {
			value, _ := json.Marshal(map[string]any{"version": 1, "sections": sections})
			_, err := NewService(&fakeRepository{}).UpdateContent(context.Background(), "appearance.page."+page, string(value), "admin")
			if (err == nil) != expected {
				t.Fatalf("%s expected %v: %v", page, expected, err)
			}
		}
		check(true)
		sections = append(sections, sections[0])
		check(false)
	}
}
