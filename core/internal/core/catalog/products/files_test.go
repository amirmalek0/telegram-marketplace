package products

import (
	"context"
	"reflect"
	filesrepo "telegram-marketplace/internal/core/catalog/files/repository"
	messagesrepo "telegram-marketplace/internal/core/catalog/messages/repository"
	"telegram-marketplace/internal/core/catalog/products/model"
	"telegram-marketplace/internal/core/catalog/products/repository"
	"testing"
)

const firstFile = "10000000-0000-0000-0000-000000000001"
const secondFile = "10000000-0000-0000-0000-000000000002"

type filesStub struct {
	filesrepo.Repository
	missing string
	checked []string
}

func (f *filesStub) Exists(_ context.Context, id string) (bool, error) {
	f.checked = append(f.checked, id)
	return id != f.missing, nil
}

type messagesStub struct{ messagesrepo.Repository }

func (messagesStub) Exists(context.Context, string) (bool, error) { return true, nil }

type productStub struct {
	repository.Repository
	product *model.Product
	writes  int
}

func (r *productStub) Create(_ context.Context, p *model.Product) error {
	r.product = p
	r.writes++
	return nil
}
func (r *productStub) Update(_ context.Context, p *model.Product) error {
	r.product = p
	r.writes++
	return nil
}
func (r *productStub) GetByID(context.Context, string) (*model.Product, error) {
	p := *r.product
	return &p, nil
}

func TestNormalizeProductFiles(t *testing.T) {
	legacy := firstFile
	for _, tc := range []struct {
		name    string
		legacy  *string
		ids     []string
		wantErr bool
		want    int
	}{
		{"legacy", &legacy, nil, false, 1},
		{"multiple", nil, []string{firstFile, secondFile}, false, 2},
		{"duplicate", nil, []string{firstFile, firstFile}, true, 0},
		{"invalid", nil, []string{"invalid"}, true, 0},
		{"conflicting alias", &legacy, []string{secondFile}, true, 0},
		{"explicit empty with alias", &legacy, []string{}, true, 0},
		{"too many", nil, make([]string, 101), true, 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ids, first, err := normalizeProductFiles(tc.legacy, tc.ids)
			if (err != nil) != tc.wantErr {
				t.Fatalf("unexpected error: %v", err)
			}
			if !tc.wantErr && (len(ids) != tc.want || first == nil || *first != ids[0]) {
				t.Fatal("wrong file ordering/legacy alias")
			}
		})
	}
}

func TestMultiFileCreateAndUpdate(t *testing.T) {
	ctx := context.Background()
	repo := &productStub{}
	files := &filesStub{}
	s := NewService(repo, files, messagesStub{}, nil, nil, nil, nil)
	p, err := s.Create(ctx, CreateRequest{Title: "Files", DeliveryType: "file", FileIDs: []string{firstFile, secondFile}})
	if err != nil || !reflect.DeepEqual(p.FileIDs, []string{firstFile, secondFile}) || len(files.checked) != 2 {
		t.Fatalf("create: %v", err)
	}
	_, err = s.Update(ctx, "product", UpdateRequest{FileIDs: []string{secondFile}})
	if err != nil || len(repo.product.FileIDs) != 1 || *repo.product.FileID != secondFile {
		t.Fatalf("replace: %v", err)
	}
	title := "renamed"
	_, err = s.Update(ctx, "product", UpdateRequest{Title: &title})
	if err != nil || len(repo.product.FileIDs) != 1 {
		t.Fatalf("omitted list was not preserved: %v", err)
	}
	writes := repo.writes
	if _, err = s.Update(ctx, "product", UpdateRequest{FileIDs: []string{}}); err == nil || repo.writes != writes {
		t.Fatal("empty file delivery was saved")
	}
	kind := "message"
	message := "message-id"
	_, err = s.Update(ctx, "product", UpdateRequest{DeliveryType: &kind, MessageID: &message})
	if err != nil || len(repo.product.FileIDs) != 0 || repo.product.FileID != nil {
		t.Fatalf("delivery switch retained stale files: %v", err)
	}
}

func TestRejectMissingAdditionalFile(t *testing.T) {
	repo := &productStub{}
	files := &filesStub{missing: secondFile}
	s := NewService(repo, files, nil, nil, nil, nil, nil)
	if _, err := s.Create(context.Background(), CreateRequest{DeliveryType: "file", FileIDs: []string{firstFile, secondFile}}); err == nil || repo.writes != 0 {
		t.Fatal("missing additional file accepted")
	}
}
