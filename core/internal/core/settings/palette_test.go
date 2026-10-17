package settings

import (
	"context"
	"strings"
	"testing"
)

func TestPaletteValidationBeforePersistence(t *testing.T) {
	colors := `{"accent":"#007aff","background":"#f5f5f7","surface":"#ffffff","text":"#111114","secondary":"#6e6e73","navigation":"#17171a"}`
	valid := `{"light":` + colors + `,"dark":` + colors + `}`
	for _, value := range []string{
		`null`, `{}`, `{"light":` + colors + `}`, valid + `{}`,
		strings.Replace(valid, "#007aff", "red; background: url(https://example.com)", 1),
		strings.Replace(valid, "#007aff", "#fff", 1),
		strings.Replace(valid, `"accent":`, `"unknown":`, 1),
		strings.Replace(valid, `"light":`, `"unknown":`, 1),
	} {
		repo := &fakeRepository{}
		if _, err := NewService(repo).UpdateContent(context.Background(), "appearance.palette", value, "admin"); err == nil || repo.last != nil {
			t.Fatalf("invalid palette reached persistence: %s", value)
		}
	}
	repo := &fakeRepository{}
	service := NewService(repo)
	if _, err := service.UpdateContent(context.Background(), "appearance.palette", valid, "admin"); err != nil || repo.last == nil {
		t.Fatalf("valid palette was rejected: %v", err)
	}
	if err := service.ResetContent(context.Background(), "appearance.palette"); err != nil || repo.deleted != "appearance.palette" {
		t.Fatalf("palette reset failed: %v", err)
	}
}
