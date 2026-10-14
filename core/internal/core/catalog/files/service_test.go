package files

import (
	"context"
	"errors"
	bundlesrepo "telegram-marketplace/internal/core/catalog/bundles/repository"
	"telegram-marketplace/internal/core/catalog/files/model"
	"telegram-marketplace/internal/core/catalog/files/repository"
	"telegram-marketplace/pkg/storage"
	"testing"
)

type referencedFileRepo struct{ repository.Repository }

func (referencedFileRepo) GetByID(context.Context, string) (*model.File, error) {
	return &model.File{StorageID: "protected"}, nil
}
func (referencedFileRepo) Delete(context.Context, string) error { return repository.ErrReferenced }

type unbundledFileRepo struct{ bundlesrepo.Repository }

func (unbundledFileRepo) IsFileReferenced(context.Context, string) (bool, error) { return false, nil }

type deletionSpy struct {
	storage.Storage
	deleted bool
}

func (s *deletionSpy) Delete(context.Context, string) error { s.deleted = true; return nil }

func TestReferencedProductFileIsNotRemovedFromStorage(t *testing.T) {
	store := &deletionSpy{}
	err := NewService(referencedFileRepo{}, store, unbundledFileRepo{}).Delete(context.Background(), "file")
	if !errors.Is(err, repository.ErrReferenced) || store.deleted {
		t.Fatal("protected delivery file was removed from storage")
	}
}
