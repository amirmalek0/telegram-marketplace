package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"telegram-marketplace/internal/core/settings/model"
)

const globalTestID = "widget-12345678"

func TestGlobalWidgetIconsAndUnusedDeletion(t *testing.T) {
	key := globalWidgetPrefix + globalTestID
	base := globalJSON("ویجت", imageLayout(map[string]any{}, "", ""))
	for _, icon := range []string{"lucide:globe", "lucide:heart", "shop"} {
		var document map[string]any
		json.Unmarshal([]byte(base), &document)
		document["icon"] = icon
		value, _ := json.Marshal(document)
		repo := &fakeRepository{}
		if _, err := NewService(repo).UpdateContent(context.Background(), key, string(value), "admin"); err != nil {
			t.Fatal(err)
		}
		if repo.last == nil || repo.last.Value != string(value) {
			t.Fatal("icon not persisted")
		}
	}
	for _, icon := range []any{nil, "", 1, "lucide:missing-icon", "https://bad.test/icon.svg"} {
		var document map[string]any
		json.Unmarshal([]byte(base), &document)
		document["icon"] = icon
		value, _ := json.Marshal(document)
		if _, err := validateGlobalWidget(key, string(value)); err == nil {
			t.Fatalf("invalid icon accepted: %v", icon)
		}
	}
	repo := &fakeRepository{entries: []model.ContentEntry{{Key: key, Value: base}}}
	if err := NewService(repo).ResetContent(context.Background(), key); err != nil || repo.deleted != key {
		t.Fatalf("unused global deletion failed: %v", err)
	}
}

func globalJSON(name string, sections ...any) string {
	value, _ := json.Marshal(map[string]any{"version": 1, "name": name, "sections": sections})
	return string(value)
}
func globalReference(id string) map[string]any {
	return map[string]any{"type": "global.widget", "design": "original", "visible": true, "id": id, "widgetId": globalTestID}
}
func globalPage(sections ...any) string {
	value, _ := json.Marshal(map[string]any{"version": 1, "sections": sections})
	return string(value)
}
func TestGlobalWidgetValidationAndReferences(t *testing.T) {
	key := globalWidgetPrefix + globalTestID
	image := imageLayout(map[string]any{}, "", "")
	valid := globalJSON("گروه", image)
	if _, err := validateGlobalWidget(key, valid); err != nil {
		t.Fatal(err)
	}
	for _, value := range []string{globalJSON("", image), globalJSON(strings.Repeat("a", 81), image), globalJSON("گروه"), globalJSON("گروه", globalReference("widget-87654321")), globalJSON("گروه", map[string]any{"type": "product.checkout", "visible": true, "design": "original"}), globalJSON("گروه", map[string]any{"type": "product.description", "visible": true, "design": "original"})} {
		if _, err := validateGlobalWidget(key, value); err == nil {
			t.Fatalf("invalid definition accepted: %s", value)
		}
	}
	page := globalPage(globalReference("widget-87654321"))
	if err := validatePageLayout("appearance.page.shop", page); err != nil {
		t.Fatal(err)
	}
	if err := validateGlobalMutation(nil, "appearance.page.shop", &page); err == nil {
		t.Fatal("dangling reference accepted")
	}
	entries := []model.ContentEntry{{Key: key, Value: valid}, {Key: "appearance.page.shop", Value: page}}
	if err := validateGlobalMutation(entries, "appearance.page.profile", &page); err != nil {
		t.Fatal(err)
	}
	if err := validateGlobalMutation(entries, key, nil); err == nil {
		t.Fatal("referenced definition deleted")
	}
	if err := validateGlobalMutation(entries, "appearance.page.shop", nil); err != nil {
		t.Fatal(err)
	}
	if err := validateGlobalMutation(entries[:1], key, nil); err != nil {
		t.Fatal("unused definition could not be removed", err)
	}
}
func TestGlobalUpdateChecksEveryAffectedPage(t *testing.T) {
	key := globalWidgetPrefix + globalTestID
	image := imageLayout(map[string]any{}, "", "")
	builtin := map[string]any{"type": "catalog.products", "visible": true, "design": "list"}
	entries := []model.ContentEntry{{Key: key, Value: globalJSON("تصویر", image)}, {Key: "appearance.page.shop", Value: globalPage(globalReference("widget-87654321"), builtin)}}
	updated := globalJSON("تکراری", image, builtin)
	repo := &fakeRepository{entries: entries}
	if _, err := NewService(repo).UpdateContent(context.Background(), key, updated, "admin"); err == nil || repo.last != nil {
		t.Fatal("incompatible global edit persisted")
	}
	if err := NewService(repo).ResetContent(context.Background(), key); err == nil || repo.deleted != "" {
		t.Fatal("referenced global deleted")
	}
	sections := []any{}
	for n := 0; n < 24; n++ {
		sections = append(sections, globalReference(fmt.Sprintf("widget-%08d", n)))
	}
	entries[1].Value = globalPage(sections...)
	image2 := imageLayout(map[string]any{}, "", "")
	image2["id"] = "widget-22222222"
	updated = globalJSON("بزرگ", image, image2)
	if err := validateGlobalMutation(entries, key, &updated); err == nil {
		t.Fatal("expanded widget count was unbounded")
	}
}
func TestGlobalNamesReferencesAndContentLimits(t *testing.T) {
	key := globalWidgetPrefix + globalTestID
	image := imageLayout(map[string]any{}, "", strings.Repeat(" ", 4000))
	value := globalJSON("تصویر", image)
	repo := &fakeRepository{}
	if _, err := NewService(repo).UpdateContent(context.Background(), key, value, "admin"); err != nil {
		t.Fatal("global document still has old text limit", err)
	}
	for _, widgetID := range []any{"unknown", nil, "../invalid"} {
		ref := globalReference("widget-87654321")
		ref["widgetId"] = widgetID
		if err := validatePageLayout("appearance.page.shop", globalPage(ref)); err == nil {
			t.Fatal("invalid reference accepted")
		}
	}
	entries := []model.ContentEntry{}
	for n := 0; n < 100; n++ {
		entries = append(entries, model.ContentEntry{Key: globalWidgetPrefix + fmt.Sprintf("widget-%08d", n), Value: value})
	}
	if err := validateGlobalMutation(entries, key, &value); err == nil {
		t.Fatal("unbounded global library")
	}
}
