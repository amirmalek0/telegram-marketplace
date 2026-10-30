package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"telegram-marketplace/internal/core/settings/model"
)

func (s *Service) DeleteGlobalWidget(ctx context.Context, key, adminID string) error {
	if !strings.HasPrefix(key, globalWidgetPrefix) || !widgetIDPattern.MatchString(strings.TrimPrefix(key, globalWidgetPrefix)) {
		return fmt.Errorf("invalid global widget key")
	}
	return s.repo.DeleteLinkedContent(ctx, key, adminID, func(entries []model.ContentEntry) ([]model.ContentEntry, error) {
		return removeGlobalReferences(entries, key)
	})
}

func removeGlobalReferences(entries []model.ContentEntry, key string) ([]model.ContentEntry, error) {
	widgetID := strings.TrimPrefix(key, globalWidgetPrefix)
	updated := append([]model.ContentEntry(nil), entries...)
	changes := []model.ContentEntry{}
	for i, entry := range updated {
		if !strings.HasPrefix(entry.Key, "appearance.page.") {
			continue
		}
		var document map[string]json.RawMessage
		var sections []map[string]json.RawMessage
		if json.Unmarshal([]byte(entry.Value), &document) != nil || json.Unmarshal(document["sections"], &sections) != nil {
			return nil, fmt.Errorf("چیدمان صفحه %s نامعتبر است؛ پیش از حذف ویجت آن را اصلاح کنید", strings.TrimPrefix(entry.Key, "appearance.page."))
		}
		kept := make([]map[string]json.RawMessage, 0, len(sections))
		for _, section := range sections {
			var kind, ref string
			json.Unmarshal(section["type"], &kind)
			json.Unmarshal(section["widgetId"], &ref)
			if kind != "global.widget" || ref != widgetID {
				kept = append(kept, section)
			}
		}
		if len(kept) == len(sections) {
			continue
		}
		document["sections"], _ = json.Marshal(kept)
		value, err := json.Marshal(document)
		if err != nil {
			return nil, err
		}
		if err = validatePageLayout(entry.Key, string(value)); err != nil {
			return nil, err
		}
		updated[i].Value = string(value)
		changes = append(changes, updated[i])
	}
	if err := validateGlobalMutation(updated, key, nil); err != nil {
		return nil, err
	}
	return changes, nil
}
