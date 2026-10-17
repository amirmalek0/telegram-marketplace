package userphotos

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"telegram-marketplace/internal/core/membership/userphotos/model"
	"telegram-marketplace/internal/core/membership/userphotos/repository"
	"telegram-marketplace/internal/platform/telegram"
	"telegram-marketplace/pkg/storage"
)

type Telegram interface {
	GetProfilePhotos(context.Context, int64, int) (telegram.ProfilePhotos, error)
	DownloadProfilePhoto(context.Context, string) ([]byte, string, error)
}
type Store interface {
	storage.Storage
	storage.Reader
}
type Service struct {
	repo     repository.Repository
	telegram Telegram
	store    Store
}

func NewService(repo repository.Repository, api Telegram, store Store) *Service {
	return &Service{repo, api, store}
}
func ContentURL(userID, photoID string) string {
	return "/api/v1/user/" + userID + "/photos/" + photoID + "/content"
}
func (s *Service) Schedule(ctx context.Context, id string) error { return s.repo.Schedule(ctx, id) }

// ScheduleVisit queues a stale avatar refresh without blocking on Telegram.
// The repository atomically coalesces visits across API replicas and restarts.
func (s *Service) ScheduleVisit(ctx context.Context, id string) error {
	return s.repo.ScheduleVisit(ctx, id)
}
func (s *Service) Request(ctx context.Context, id string) error {
	if _, err := s.repo.Owner(ctx, id); err != nil {
		return err
	}
	return s.repo.Request(ctx, id)
}
func (s *Service) List(ctx context.Context, id string, limit, offset int) (Gallery, error) {
	if _, err := s.repo.Owner(ctx, id); err != nil {
		return Gallery{}, err
	}
	photos, total, err := s.repo.List(ctx, id, limit, offset)
	if err != nil {
		return Gallery{}, err
	}
	state, err := s.repo.State(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		state.Status = "pending"
		err = s.Schedule(ctx, id)
	}
	if err != nil {
		return Gallery{}, err
	}
	result := Gallery{Photos: []PhotoResponse{}, Total: total, Sync: state}
	for _, p := range photos {
		result.Photos = append(result.Photos, PhotoResponse{p.ID, ContentURL(id, p.ID), p.Width, p.Height, p.SavedAt, p.Current})
	}
	return result, nil
}
func (s *Service) Owner(ctx context.Context, id string) (int64, error) { return s.repo.Owner(ctx, id) }
func (s *Service) Open(ctx context.Context, id, photoID string) (io.ReadCloser, int64, string, error) {
	p, err := s.repo.Get(ctx, id, photoID)
	if err != nil {
		return nil, 0, "", err
	}
	body, size, _, err := s.store.Open(ctx, p.StorageKey)
	return body, size, p.ContentType, err
}

// Run is owned by the API process. Database leases also make multiple API
// replicas safe; failures remain durable and are retried without losing photos.
func (s *Service) Run(ctx context.Context) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	var seeded time.Time
	for {
		if time.Since(seeded) > time.Minute {
			maintenance, cancel := context.WithTimeout(ctx, 30*time.Second)
			if err := s.repo.Seed(maintenance); err == nil {
				seeded = time.Now()
			} else {
				log.Print("profile photos: queue unavailable")
			}
			keys, _ := s.repo.Deletions(maintenance)
			for _, key := range keys {
				if err := s.store.Delete(maintenance, key); err == nil {
					_ = s.repo.Deleted(maintenance, key)
				}
			}
			cancel()
		}
		job, err := s.repo.Claim(ctx)
		if err == nil {
			work, cancel := context.WithTimeout(ctx, 2*time.Minute)
			next, err := s.syncPage(work, job)
			cancel()
			status, message := "ready", ""
			if next > 0 {
				status = "pending"
			}
			if err != nil {
				status = "error"
				next = job.Offset
				message = "دریافت تصاویر از تلگرام ناموفق بود؛ دوباره تلاش می‌شود."
			}
			finish, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			if err := s.repo.Finish(finish, job.UserID, status, next, message); err != nil {
				log.Print("profile photos: could not complete sync lease")
			}
			cancel()
		} else if !errors.Is(err, pgx.ErrNoRows) {
			log.Print("profile photos: queue unavailable")
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
func (s *Service) syncPage(ctx context.Context, j model.Job) (int, error) {
	page, err := s.telegram.GetProfilePhotos(ctx, j.TelegramID, j.Offset)
	if err != nil {
		return 0, err
	}
	if j.Offset == 0 && page.Total == 0 {
		return 0, s.repo.Current(ctx, j.UserID, "")
	}
	if len(page.Photos) == 0 && j.Offset < page.Total {
		return 0, errors.New("incomplete profile photo page")
	}
	for i, sizes := range page.Photos {
		var best telegram.PhotoSize
		for _, p := range sizes {
			if p.FileID != "" && p.UniqueID != "" && p.Width*p.Height > best.Width*best.Height {
				best = p
			}
		}
		if best.FileID == "" {
			return 0, errors.New("invalid profile photo")
		}
		photo, err := s.repo.Existing(ctx, j.UserID, best.UniqueID)
		if errors.Is(err, pgx.ErrNoRows) {
			data, kind, err := s.telegram.DownloadProfilePhoto(ctx, best.FileID)
			if err != nil {
				return 0, err
			}
			photo = model.Photo{ID: uuid.NewString(), UserID: j.UserID, UniqueID: best.UniqueID, ContentType: kind, Width: best.Width, Height: best.Height}
			photo.StorageKey = j.UserID + "/" + photo.ID
			if _, err = s.store.Upload(ctx, photo.StorageKey, bytes.NewReader(data), int64(len(data)), kind); err != nil {
				return 0, err
			}
			photo.Position = j.Offset + i
			if err = s.repo.Save(ctx, photo); err != nil {
				// A user may have been deleted during download. Never retain that upload.
				cleanup, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				_ = s.store.Delete(cleanup, photo.StorageKey)
				return 0, err
			}
		} else if err != nil {
			return 0, err
		} else {
			photo.Position = j.Offset + i
			if err = s.repo.Save(ctx, photo); err != nil {
				return 0, err
			}
		}
		if j.Offset+i == 0 {
			if err = s.repo.Current(ctx, j.UserID, ContentURL(j.UserID, photo.ID)); err != nil {
				return 0, err
			}
		}
	}
	next := j.Offset + len(page.Photos)
	if next < page.Total {
		return next, nil
	}
	return 0, nil
}
