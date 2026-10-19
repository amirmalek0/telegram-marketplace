package settings

import (
	"context"
	"encoding/json"
	"testing"
)

func TestPageLayoutsAllAllowedSections(t *testing.T) {
	if len(layoutPages) != 12 || len(pageSectionRules) != 27 {
		t.Fatal("unexpected registry size")
	}
	for page := range layoutPages {
		for sectionType, rule := range pageSectionRules {
			if rule.page != "" && rule.page != page {
				continue
			}
			for _, design := range rule.designs {
				for _, visible := range []bool{true, false} {
					if rule.required && !visible {
						continue
					}
					sections := []map[string]any{{"type": sectionType, "visible": visible, "design": design}}
					for requiredType, requiredRule := range pageSectionRules {
						if requiredRule.page == page && requiredRule.required && requiredType != sectionType {
							sections = append(sections, map[string]any{"type": requiredType, "visible": true, "design": "original"})
						}
					}
					value, _ := json.Marshal(map[string]any{"version": 1, "sections": sections})
					repo := &fakeRepository{}
					if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.page."+page, string(value), "admin"); err != nil || repo.last == nil || repo.last.Value != string(value) {
						t.Fatalf("%s/%s/%s rejected: %v", page, sectionType, design, err)
					}
				}
			}
		}
	}
}

func TestPageLayoutRejectsUnsafeAndProtectedConfiguration(t *testing.T) {
	cases := []struct{ page, value string }{
		{"unknown", `{"version":1,"sections":[]}`},
		{"shop", `null`}, {"shop", `[]`}, {"shop", `{"version":2,"sections":[]}`},
		{"shop", `{"version":1,"sections":null}`},
		{"shop", `{"version":1,"sections":[],"extra":true}`},
		{"shop", `{"version":1,"sections":[{"type":"catalog.products","design":"list"}]}`},
		{"shop", `{"version":1,"sections":[{"type":"catalog.products","visible":null,"design":"list"}]}`},
		{"shop", `{"version":1,"sections":[{"type":"catalog.products","visible":true,"design":"script"}]}`},
		{"shop", `{"version":1,"sections":[{"type":"account.identity","visible":true,"design":"original","html":"<script>"}]}`},
		{"shop", `{"version":1,"sections":[{"type":"product.checkout","visible":true,"design":"original"}]}`},
		{"shop", `{"version":1,"sections":[{"type":"product.description","visible":true,"design":"original"}]}`},
		{"shop", `{"version":1,"sections":[{"type":"orders.list","visible":true,"design":"original"},{"type":"orders.list","visible":true,"design":"original"}]}`},
		{"product", `{"version":1,"sections":[]}`},
		{"product", `{"version":1,"sections":[{"type":"product.checkout","visible":false,"design":"original"}]}`},
		{"ticket", `{"version":1,"sections":[]}`},
		{"new-ticket", `{"version":1,"sections":[]}`},
	}
	for _, tc := range cases {
		repo := &fakeRepository{}
		if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.page."+tc.page, tc.value, "admin"); err == nil || repo.last != nil {
			t.Fatalf("invalid layout reached persistence: %s %s", tc.page, tc.value)
		}
	}
}

func TestPageLayoutResetRestoresDefaults(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	if _, err := service.UpdateContent(context.Background(), "appearance.page.shop", `{"version":1,"sections":[]}`, "admin"); err != nil {
		t.Fatal(err)
	}
	if err := service.ResetContent(context.Background(), "appearance.page.shop"); err != nil || repo.deleted != "appearance.page.shop" {
		t.Fatal("could not reset layout")
	}
}
