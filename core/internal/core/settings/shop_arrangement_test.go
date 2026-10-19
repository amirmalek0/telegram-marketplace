package settings

import (
	"context"
	"fmt"
	"testing"
)

func TestShopArrangementValidationBeforePersistence(t *testing.T) {
	for _, value := range []string{`null`, `{}`, `[]`, `["products"]`, `["products","products"]`, `["categories","tickets"]`, `["products","categories","products"]`, `[1,2]`, `["products","categories"]{}`} {
		repo := &fakeRepository{}
		if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.shop_sections", value, "admin"); err == nil || repo.last != nil {
			t.Fatalf("invalid arrangement reached persistence: %s", value)
		}
	}
	for _, value := range []string{`["categories","products"]`, `["products","categories"]`} {
		repo := &fakeRepository{}
		service := NewService(repo)
		if _, err := service.UpdateContent(context.Background(), "appearance.shop_sections", value, "admin"); err != nil || repo.last == nil {
			t.Fatalf("valid arrangement rejected: %v", err)
		}
		if err := service.ResetContent(context.Background(), "appearance.shop_sections"); err != nil || repo.deleted != "appearance.shop_sections" {
			t.Fatalf("arrangement reset failed: %v", err)
		}
	}
}

func TestShopVisibilityValidationAndPersistence(t *testing.T) {
	for _, order := range []string{`["categories","products"]`, `["products","categories"]`} {
		for _, hidden := range []string{`[]`, `["categories"]`, `["products"]`, `["categories","products"]`, `["products","categories"]`} {
			value := fmt.Sprintf(`{"order":%s,"hidden":%s}`, order, hidden)
			repo := &fakeRepository{}
			if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.shop_sections", value, "admin"); err != nil || repo.last == nil {
				t.Fatalf("valid visibility rejected: %s: %v", value, err)
			}
			if repo.last.Value != value {
				t.Fatalf("order and visibility were not persisted together")
			}
		}
	}
	for _, value := range []string{
		`{"order":["categories","products"]}`,
		`{"order":["categories","products"],"hidden":null}`,
		`{"order":["categories","products"],"hidden":true}`,
		`{"order":["categories","products"],"hidden":["profile"]}`,
		`{"order":["categories","products"],"hidden":["products","products"]}`,
		`{"order":["products"],"hidden":[]}`,
		`{"order":["products","products"],"hidden":[]}`,
		`{"order":["categories","products"],"hidden":[],"extra":true}`,
		`{"order":["categories","products"],"hidden":[1]}`,
		`{"order":["categories","products"],"hidden":[]}{}`,
	} {
		repo := &fakeRepository{}
		if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.shop_sections", value, "admin"); err == nil || repo.last != nil {
			t.Fatalf("invalid visibility reached persistence: %s", value)
		}
	}
}
