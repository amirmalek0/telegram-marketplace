package settings

import (
	"context"
	"encoding/json"
	"testing"

	"telegram-marketplace/internal/core/settings/model"
)

func TestDeleteGlobalWidgetRemovesEveryPlacementOnly(t *testing.T) {
	key := globalWidgetPrefix + globalTestID
	image := imageLayout(map[string]any{}, "", "")
	hidden := globalReference("widget-hidden123")
	hidden["visible"] = false
	other := globalReference("widget-other1234")
	other["widgetId"] = "widget-otherdef1"
	checkout := map[string]any{"type": "product.checkout", "visible": true, "design": "original"}
	entries := []model.ContentEntry{
		{Key: key, Value: globalJSON("delete me", image)},
		{Key: globalWidgetPrefix + "widget-otherdef1", Value: globalJSON("keep me", image)},
		{Key: "appearance.page.shop", Value: globalPage(globalReference("widget-ref12345"), image, hidden, other)},
		{Key: "appearance.page.profile", Value: globalPage(globalReference("widget-ref12346"))},
		{Key: "appearance.page.product", Value: globalPage(checkout, globalReference("widget-ref12347"))},
		{Key: "appearance.page.wallet", Value: globalPage(image)},
		{Key: "shop.title", Value: "keep this text"},
	}
	repo := &fakeRepository{entries: entries}
	if err := NewService(repo).DeleteGlobalWidget(context.Background(), key, "admin"); err != nil {
		t.Fatal(err)
	}
	if repo.deleted != key || len(repo.linkedUpdates) != 3 {
		t.Fatalf("unexpected deletion: %s, %d pages", repo.deleted, len(repo.linkedUpdates))
	}
	want := map[string]string{
		"appearance.page.shop":    globalPage(image, other),
		"appearance.page.profile": globalPage(),
		"appearance.page.product": globalPage(checkout),
	}
	for _, entry := range repo.linkedUpdates {
		var gotDoc, wantDoc any
		json.Unmarshal([]byte(entry.Value), &gotDoc)
		// globalPage() marshals nil as null, but emptied pages must use [].
		if entry.Key == "appearance.page.profile" {
			want[entry.Key] = `{"version":1,"sections":[]}`
		}
		json.Unmarshal([]byte(want[entry.Key]), &wantDoc)
		gotJSON, _ := json.Marshal(gotDoc)
		wantJSON, _ := json.Marshal(wantDoc)
		if string(gotJSON) != string(wantJSON) {
			t.Fatalf("%s changed unrelated content: %s", entry.Key, entry.Value)
		}
	}
	if entries[2].Value != globalPage(globalReference("widget-ref12345"), image, hidden, other) {
		t.Fatal("input graph mutated")
	}
}

func TestDeleteGlobalWidgetFailsWithoutPartialChanges(t *testing.T) {
	key := globalWidgetPrefix + globalTestID
	repo := &fakeRepository{entries: []model.ContentEntry{
		{Key: key, Value: globalJSON("widget", imageLayout(map[string]any{}, "", ""))},
		{Key: "appearance.page.shop", Value: globalPage(globalReference("widget-ref12345"))},
		{Key: "appearance.page.profile", Value: "broken json"},
	}}
	if err := NewService(repo).DeleteGlobalWidget(context.Background(), key, "admin"); err == nil {
		t.Fatal("invalid graph accepted")
	}
	if repo.deleted != "" || len(repo.linkedUpdates) != 0 {
		t.Fatal("partial mutation")
	}
	for _, invalid := range []string{"shop.title", "appearance.widget.bad", "appearance.page.shop"} {
		if err := NewService(repo).DeleteGlobalWidget(context.Background(), invalid, "admin"); err == nil {
			t.Fatal("invalid key accepted")
		}
	}
}
