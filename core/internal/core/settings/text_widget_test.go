package settings

import (
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestTextWidgetsSharedContract(t *testing.T) {
	data, err := os.ReadFile("testdata/text_widgets.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Name     string
		Expected bool
		Page     string
		Value    string
	}
	if err := json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}
	for _, tc := range cases {
		t.Run(tc.Name, func(t *testing.T) {
			repo := &fakeRepository{}
			_, err := NewService(repo).UpdateContent(context.Background(), "appearance.page."+tc.Page, tc.Value, "admin")
			if (err == nil) != tc.Expected || (repo.last != nil) != tc.Expected {
				t.Fatalf("expected valid=%v; got %v", tc.Expected, err)
			}
		})
	}
}

func TestTextWidgetLimitsAndAllPages(t *testing.T) {
	for page := range layoutPages {
		sections := []map[string]any{}
		for kind, rule := range pageSectionRules {
			if rule.page == page && rule.required {
				sections = append(sections, map[string]any{"type": kind, "visible": true, "design": "original"})
			}
		}
		sections = append(sections, map[string]any{"id": "widget-12345678", "type": "text.paragraph", "visible": true, "design": "plain", "text": map[string]any{"tag": "p", "content": strings.Repeat("الف", 1000), "styles": map[string]any{}, "css": ""}})
		value, _ := json.Marshal(map[string]any{"version": 1, "sections": sections})
		repo := &fakeRepository{}
		if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.page."+page, string(value), "admin"); err != nil {
			t.Fatalf("%s rejected text layout larger than old limit: %v", page, err)
		}
	}
	repo := &fakeRepository{}
	if _, err := NewService(repo).UpdateContent(context.Background(), "shop.title", strings.Repeat("a", 4001), "admin"); err == nil {
		t.Fatal("ordinary text limits changed")
	}
	if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.page.shop", strings.Repeat(" ", 262145), "admin"); err == nil {
		t.Fatal("oversized layout accepted")
	}
}
