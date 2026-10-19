package settings

import (
	"context"
	"fmt"
	"testing"
)

func TestShopDesignsValidationBeforePersistence(t *testing.T) {
	for _, value := range []string{
		"null", "{}", "[]", "{", `{"categories":"grid"}`,
		`{"categories":"ribbon","products":"tiles"}`,
		`{"categories":"featured","products":"list"}`,
		`{"categories":"grid","products":"grid","extra":"true"}`,
		`{"categories":1,"products":"list"}`,
		`{"categories":"grid","products":"grid"}{}`,
	} {
		repo := &fakeRepository{}
		if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.shop_designs", value, "admin"); err == nil || repo.last != nil {
			t.Fatalf("invalid designs reached persistence: %s", value)
		}
	}
	for _, categories := range []string{"ribbon", "grid", "pills", "list", "tiles"} {
		for _, products := range []string{"list", "grid", "featured", "compact", "carousel"} {
			repo := &fakeRepository{}
			service := NewService(repo)
			value := fmt.Sprintf(`{"categories":%q,"products":%q}`, categories, products)
			if _, err := service.UpdateContent(context.Background(), "appearance.shop_designs", value, "admin"); err != nil || repo.last == nil {
				t.Fatalf("valid designs rejected: %s: %v", value, err)
			}
			if err := service.ResetContent(context.Background(), "appearance.shop_designs"); err != nil || repo.deleted != "appearance.shop_designs" {
				t.Fatalf("design reset failed: %v", err)
			}
		}
	}
}
