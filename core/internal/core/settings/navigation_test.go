package settings

import (
	"context"
	"encoding/json"
	"os"
	"testing"
)

func TestNavigationSharedFixtures(t *testing.T) {
	data, err := os.ReadFile("testdata/navigation.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []struct {
		Name     string
		Expected bool
		Value    json.RawMessage
	}
	if err = json.Unmarshal(data, &fixtures); err != nil {
		t.Fatal(err)
	}
	for _, fixture := range fixtures {
		t.Run(fixture.Name, func(t *testing.T) {
			repo := &fakeRepository{}
			_, err := NewService(repo).UpdateContent(context.Background(), "appearance.navigation", string(fixture.Value), "admin")
			if (err == nil) != fixture.Expected || (repo.last != nil) != fixture.Expected {
				t.Fatalf("expected %v got %v", fixture.Expected, err)
			}
		})
	}
}
