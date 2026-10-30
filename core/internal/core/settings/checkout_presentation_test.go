package settings

import (
	"context"
	"testing"
)

func TestCheckoutPresentationValidation(t *testing.T) {
	for _, mode := range []string{"both", "stars_first", "toman_first"} {
		raw := `{"product":"` + mode + `","vip_plan":"stars_first","wallet_topup":"toman_first"}`
		repo := &fakeRepository{}
		if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.checkout", raw, "admin"); err != nil {
			t.Fatal(err)
		}
		if repo.last == nil || repo.last.Value != raw {
			t.Fatal("presentation not persisted")
		}
	}
	for _, raw := range []string{
		`null`, `[]`, `{}`, `{"product":"both"}`,
		`{"product":"bad","vip_plan":"stars_first","wallet_topup":"both"}`,
		`{"product":true,"vip_plan":"stars_first","wallet_topup":"both"}`,
		`{"product":"both","vip_plan":"both","wallet_topup":"both","extra":"both"}`,
	} {
		repo := &fakeRepository{}
		if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.checkout", raw, "admin"); err == nil {
			t.Fatalf("accepted %s", raw)
		}
		if repo.last != nil {
			t.Fatal("invalid presentation persisted")
		}
	}
}
