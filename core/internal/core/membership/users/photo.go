package users

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"telegram-marketplace/internal/core/membership/users/model"
)

// Mini App onboarding always supplies a signed photo value (possibly empty).
// Queue a rate-limited refresh on visits; bot updates only ensure initial sync.
// Neither source overwrites an archived avatar with a remote URL.
func (s *Service) syncPhoto(ctx context.Context, user *model.User, supplied *string) error {
	if s.photos != nil {
		if supplied != nil {
			return s.photos.ScheduleVisit(ctx, user.ID)
		}
		return s.photos.Schedule(ctx, user.ID)
	}
	if supplied == nil {
		return nil
	}
	photo := strings.TrimSpace(*supplied)
	if photo != "" {
		parsed, err := url.Parse(photo)
		if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil || len(photo) > 2048 {
			photo = ""
		}
	}
	if photo == user.PhotoURL {
		return nil
	}
	if err := s.repo.UpdatePhotoURL(ctx, user.ID, photo); err != nil {
		return fmt.Errorf("users.service.syncPhoto: %w", err)
	}
	user.PhotoURL = photo
	return nil
}
