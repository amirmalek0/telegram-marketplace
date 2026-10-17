package userphotos

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"io"
	"strings"
	"telegram-marketplace/internal/core/membership/userphotos/model"
	"telegram-marketplace/internal/core/membership/userphotos/repository"
	"telegram-marketplace/internal/platform/telegram"
	"telegram-marketplace/pkg/storage"
	"testing"
)

type fakeRepo struct {
	repository.Repository
	photos    map[string]model.Photo
	current   string
	saveError bool
}

func (r *fakeRepo) Existing(_ context.Context, user, unique string) (model.Photo, error) {
	p, ok := r.photos[unique]
	if !ok {
		return p, pgx.ErrNoRows
	}
	return p, nil
}
func (r *fakeRepo) Save(_ context.Context, p model.Photo) error {
	if r.saveError {
		return errors.New("db unavailable")
	}
	r.photos[p.UniqueID] = p
	return nil
}
func (r *fakeRepo) Current(_ context.Context, id, url string) error { r.current = url; return nil }
func (r *fakeRepo) Get(_ context.Context, id, photoID string) (model.Photo, error) {
	for _, p := range r.photos {
		if p.ID == photoID && p.UserID == id {
			return p, nil
		}
	}
	return model.Photo{}, pgx.ErrNoRows
}
func (r *fakeRepo) Owner(context.Context, string) (int64, error) { return 42, nil }

type fakeTelegram struct {
	page      telegram.ProfilePhotos
	downloads []string
	err       error
}

func (a *fakeTelegram) GetProfilePhotos(context.Context, int64, int) (telegram.ProfilePhotos, error) {
	return a.page, a.err
}
func (a *fakeTelegram) DownloadProfilePhoto(_ context.Context, id string) ([]byte, string, error) {
	a.downloads = append(a.downloads, id)
	return []byte("jpeg"), "image/jpeg", nil
}

type fakeStore struct {
	storage.Storage
	uploads, deletes, opens int
}

func (s *fakeStore) Upload(_ context.Context, key string, _ io.Reader, _ int64, _ string) (string, error) {
	s.uploads++
	return key, nil
}
func (s *fakeStore) Delete(context.Context, string) error { s.deletes++; return nil }
func (s *fakeStore) Open(context.Context, string) (io.ReadCloser, int64, string, error) {
	s.opens++
	return io.NopCloser(strings.NewReader("jpeg")), 4, "image/jpeg", nil
}
func TestSyncArchive(t *testing.T) {
	ctx := context.Background()
	repo := &fakeRepo{photos: map[string]model.Photo{}}
	store := &fakeStore{}
	api := &fakeTelegram{page: telegram.ProfilePhotos{Total: 2, Photos: [][]telegram.PhotoSize{{{FileID: "small", UniqueID: "small", Width: 80, Height: 80}, {FileID: "large", UniqueID: "large", Width: 640, Height: 640}}}}}
	service := NewService(repo, api, store)
	job := model.Job{UserID: "user", TelegramID: 42}
	next, err := service.syncPage(ctx, job)
	if err != nil || next != 1 || store.uploads != 1 || api.downloads[0] != "large" {
		t.Fatal(next, err)
	}
	current := repo.current
	if !strings.HasPrefix(current, "/api/v1/user/user/photos/") {
		t.Fatal("no private URL", current)
	}
	if _, err = service.syncPage(ctx, job); err != nil || store.uploads != 1 {
		t.Fatal("duplicate upload", err)
	}
	api.page = telegram.ProfilePhotos{Total: 2, Photos: [][]telegram.PhotoSize{{{FileID: "old", UniqueID: "old", Width: 640, Height: 640}}}}
	job.Offset = 1
	next, err = service.syncPage(ctx, job)
	if err != nil || next != 0 || repo.current != current || len(repo.photos) != 2 {
		t.Fatal("continuation changed avatar", err)
	}
	api.err = errors.New("network failure")
	job.Offset = 0
	if _, err = service.syncPage(ctx, job); err == nil || repo.current != current {
		t.Fatal("failed sync erased avatar")
	}
	api.err = nil
	api.page = telegram.ProfilePhotos{}
	if _, err = service.syncPage(ctx, job); err != nil || repo.current != "" || len(repo.photos) != 2 {
		t.Fatal("empty current must preserve archive", err)
	}
}
func TestSyncFailedSaveCleansUpload(t *testing.T) {
	repo := &fakeRepo{photos: map[string]model.Photo{}, saveError: true}
	store := &fakeStore{}
	api := &fakeTelegram{page: telegram.ProfilePhotos{Total: 1, Photos: [][]telegram.PhotoSize{{{FileID: "file", UniqueID: "unique", Width: 1, Height: 1}}}}}
	_, err := NewService(repo, api, store).syncPage(context.Background(), model.Job{UserID: "user"})
	if err == nil || store.deletes != 1 {
		t.Fatal("orphan upload retained")
	}
}
