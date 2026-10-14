package settings

import (
	"context"
	"strings"
	"testing"
	"time"

	"telegram-marketplace/internal/core/settings/model"
)

type fakeRepository struct {
	required bool
	entries  []model.ContentEntry
	last     *model.ContentEntry
	deleted  string
}

func (f *fakeRepository) PhoneVerificationRequired(context.Context) (bool, error) {
	return f.required, nil
}

func TestPhoneRequirementToggle(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	for _, required := range []bool{false, true, false} {
		result, err := service.UpdateGeneral(context.Background(), required)
		if err != nil || result.RequirePhoneVerification != required {
			t.Fatalf("update failed: %v", err)
		}
		got, err := service.PhoneVerificationRequired(context.Background())
		if err != nil || got != required {
			t.Fatalf("unexpected requirement: %v, %v", got, err)
		}
	}
}
func (f *fakeRepository) SetPhoneVerificationRequired(_ context.Context, required bool) error {
	f.required = required
	return nil
}

func (f *fakeRepository) DeleteContent(_ context.Context, key string) error {
	f.deleted = key
	return nil
}

func (f *fakeRepository) ListContent(context.Context) ([]model.ContentEntry, error) {
	return f.entries, nil
}

func TestResetContentValidatesAndDeletesOverride(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	if err := service.ResetContent(context.Background(), "Bad Key"); err == nil {
		t.Fatal("expected invalid reset key to be rejected")
	}
	if err := service.ResetContent(context.Background(), "shop.categories"); err != nil {
		t.Fatalf("ResetContent returned error: %v", err)
	}
	if repo.deleted != "shop.categories" {
		t.Fatalf("unexpected deleted key: %q", repo.deleted)
	}
}

func (f *fakeRepository) UpsertContent(_ context.Context, key, value, _ string) (*model.ContentEntry, error) {
	f.last = &model.ContentEntry{Key: key, Value: value, UpdatedAt: time.Now()}
	return f.last, nil
}

func TestListContentReturnsOverrideMap(t *testing.T) {
	now := time.Now()
	repo := &fakeRepository{entries: []model.ContentEntry{
		{Key: "shop.categories", Value: "گروه‌ها", UpdatedAt: now},
		{Key: "shop.latest_products", Value: "محصولات جدید", UpdatedAt: now.Add(time.Second)},
	}}

	result, err := NewService(repo).ListContent(context.Background())
	if err != nil {
		t.Fatalf("ListContent returned error: %v", err)
	}
	if result.Data["shop.categories"] != "گروه‌ها" || len(result.Data) != 2 {
		t.Fatalf("unexpected response: %#v", result.Data)
	}
	if result.UpdatedAt == nil || !result.UpdatedAt.Equal(now.Add(time.Second)) {
		t.Fatalf("expected latest update timestamp, got %v", result.UpdatedAt)
	}
}

func TestUpdateContentValidatesKeyAndLength(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)

	if _, err := service.UpdateContent(context.Background(), "Invalid Key", "value", "admin"); err == nil {
		t.Fatal("expected invalid key to be rejected")
	}
	if _, err := service.UpdateContent(context.Background(), "shop.title", strings.Repeat("الف", 4001), "admin"); err == nil {
		t.Fatal("expected oversized value to be rejected")
	}

	entry, err := service.UpdateContent(context.Background(), "shop.title", "فروشگاه من", "admin")
	if err != nil {
		t.Fatalf("UpdateContent returned error: %v", err)
	}
	if entry.Value != "فروشگاه من" || repo.last == nil {
		t.Fatalf("override was not persisted: %#v", entry)
	}
}
