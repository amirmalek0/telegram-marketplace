package database

import (
	"strings"
	"testing"
)

func TestMiniappWidgetMigrationKeepsScopedContentLimits(t *testing.T) {
	if len(miniappWidgetMigrations) != 1 {
		t.Fatal("constraint replacement must be atomic")
	}
	query := miniappWidgetMigrations[0]
	for _, expected := range []string{"DO $$ BEGIN", "DROP CONSTRAINT IF EXISTS miniapp_content_value_length", "ADD CONSTRAINT miniapp_content_value_length", "octet_length(value) <= 262144", "content_key LIKE 'appearance.page.%' OR content_key LIKE 'appearance.widget.%' OR char_length(value) <= 4000"} {
		if !strings.Contains(query, expected) {
			t.Fatalf("missing migration safeguard: %s", expected)
		}
	}
}
