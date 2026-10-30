package settings

import (
	"encoding/json"
	"testing"
)

func TestAppearanceOnAllBuiltinWidgets(t *testing.T) {
	for kind, rule := range pageSectionRules {
		page := rule.page
		if page == "" {
			page = "shop"
		}
		sections := []any{map[string]any{"type": kind, "visible": true, "design": rule.designs[0], "appearance": map[string]any{"styles": map[string]any{"fontSize": 18, "paddingTop": 20, "width": 80}, "css": ".widget{border-radius:20px}"}}}
		for essential, r := range pageSectionRules {
			if r.page == page && r.required && essential != kind {
				sections = append(sections, map[string]any{"type": essential, "visible": true, "design": "original"})
			}
		}
		if err := validatePageLayout("appearance.page."+page, globalPage(sections...)); err != nil {
			t.Fatal(kind, err)
		}
	}
}
func TestAppearanceRejectsUnsafeCSSAndInvalidFields(t *testing.T) {
	for _, raw := range []string{`null`, `{"styles":{},"css":null}`, `{"styles":{"position":"fixed"},"css":""}`, `{"styles":{},"css":"@keyframes spin{to{opacity:0}}"}`, `{"styles":{},"css":".widget{background:url(https://evil.test)}"}`} {
		if err := validateWidgetAppearance(json.RawMessage(raw)); err == nil {
			t.Fatal("unsafe appearance accepted", raw)
		}
	}
	if err := validateWidgetAppearance(json.RawMessage(`{"styles":{},"css":"/* @font-face ignored */ @MEDIA(max-width:480px){.widget{color:red}}"}`)); err != nil {
		t.Fatal(err)
	}
}
