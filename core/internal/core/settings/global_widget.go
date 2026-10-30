package settings

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"

	"telegram-marketplace/internal/core/settings/model"
)

const globalWidgetPrefix = "appearance.widget."

type globalWidget struct {
	Version  int                          `json:"version"`
	Name     string                       `json:"name"`
	Sections []map[string]json.RawMessage `json:"sections"`
}

func validateGlobalWidget(key, value string) (*globalWidget, error) {
	invalid := fmt.Errorf("ویجت سراسری نامعتبر است؛ نام، محتوا و تنظیمات را بررسی کنید")
	if !widgetIDPattern.MatchString(strings.TrimPrefix(key, globalWidgetPrefix)) {
		return nil, invalid
	}
	var fields map[string]json.RawMessage
	var widget globalWidget
	if json.Unmarshal([]byte(value), &fields) != nil || json.Unmarshal([]byte(value), &widget) != nil || widget.Version != 1 || strings.TrimSpace(widget.Name) == "" || utf8.RuneCountInString(widget.Name) > 80 || len(widget.Sections) == 0 {
		return nil, invalid
	}
	for field := range fields {
		if field != "version" && field != "name" && field != "sections" && field != "icon" {
			return nil, invalid
		}
	}
	if raw, exists := fields["icon"]; exists {
		var icon string
		if json.Unmarshal(raw, &icon) != nil || !validNavigationIcon(icon) {
			return nil, invalid
		}
	}
	for _, section := range widget.Sections {
		var kind string
		json.Unmarshal(section["type"], &kind)
		if kind == "global.widget" || pageSectionRules[kind].page != "" {
			return nil, fmt.Errorf("گروه سراسری نمی‌تواند شامل گروه دیگر یا کنترل مخصوص یک صفحه باشد")
		}
	}
	layout, _ := json.Marshal(map[string]any{"version": 1, "sections": widget.Sections})
	if err := validatePageLayout("appearance.page.shop", string(layout)); err != nil {
		return nil, err
	}
	return &widget, nil
}

// Validate the complete linked graph under the repository's content-write lock.
// Only atomic reusable children are allowed, so references cannot form cycles.
func validateGlobalMutation(entries []model.ContentEntry, key string, value *string) error {
	content := make(map[string]string, len(entries)+1)
	for _, entry := range entries {
		content[entry.Key] = entry.Value
	}
	if value == nil {
		delete(content, key)
	} else {
		content[key] = *value
	}
	library := map[string]*globalWidget{}
	for k, v := range content {
		if !strings.HasPrefix(k, globalWidgetPrefix) {
			continue
		}
		widget, err := validateGlobalWidget(k, v)
		if err != nil {
			return err
		}
		library[strings.TrimPrefix(k, globalWidgetPrefix)] = widget
	}
	if len(library) > 100 {
		return fmt.Errorf("حداکثر ۱۰۰ ویجت سراسری مجاز است")
	}
	for k, v := range content {
		if !strings.HasPrefix(k, "appearance.page.") {
			continue
		}
		var layout struct {
			Sections []map[string]json.RawMessage `json:"sections"`
		}
		if json.Unmarshal([]byte(v), &layout) != nil {
			continue
		} // Old malformed overrides already fall back to defaults.
		count := 0
		seen := map[string]bool{}
		for _, section := range layout.Sections {
			var kind, ref string
			json.Unmarshal(section["type"], &kind)
			children := []map[string]json.RawMessage{section}
			if kind == "global.widget" {
				json.Unmarshal(section["widgetId"], &ref)
				widget := library[ref]
				if widget == nil {
					return fmt.Errorf("ویجت سراسری در صفحه %s استفاده شده و باید موجود باشد", strings.TrimPrefix(k, "appearance.page."))
				}
				children = widget.Sections
			}
			count += len(children)
			for _, child := range children {
				if _, custom := child["id"]; custom {
					continue
				}
				var childType string
				json.Unmarshal(child["type"], &childType)
				if seen[childType] {
					return fmt.Errorf("ویجت آماده %s در صفحه %s تکراری می‌شود", childType, strings.TrimPrefix(k, "appearance.page."))
				}
				seen[childType] = true
			}
		}
		if count > 24 {
			return fmt.Errorf("صفحه %s بیش از ۲۴ ویجت خواهد داشت", strings.TrimPrefix(k, "appearance.page."))
		}
	}
	return nil
}
