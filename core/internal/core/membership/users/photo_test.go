package users

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"net/url"
	"sort"
	"strings"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/users/model"
	"telegram-marketplace/internal/core/membership/users/repository"
	"testing"
)

type photoRepo struct {
	repository.Repository
	user   model.User
	writes int
}

type archiveSpy struct{ scheduled, visited string }

func (s *archiveSpy) Schedule(_ context.Context, id string) error      { s.scheduled = id; return nil }
func (s *archiveSpy) ScheduleVisit(_ context.Context, id string) error { s.visited = id; return nil }
func TestArchivedPhotoIsNotOverwrittenByTelegramURL(t *testing.T) {
	repo := &photoRepo{user: model.User{ID: "self", TelegramID: 42, PhotoURL: "/api/v1/user/self/photos/photo/content"}}
	service := NewService(repo)
	archive := &archiveSpy{}
	service.SetPhotoArchive(archive)
	remote := "https://t.me/new.svg"
	for _, photo := range []*string{nil, &remote} {
		user, _, err := service.Upsert(context.Background(), CreateUserRequest{TelegramID: 42, PhotoURL: photo})
		if err != nil || user.PhotoURL != "/api/v1/user/self/photos/photo/content" || repo.writes != 0 || archive.scheduled != "self" {
			t.Fatal("local avatar overwritten", err)
		}
	}
	if archive.visited != "self" {
		t.Fatal("miniapp visit did not schedule refresh")
	}
}

func TestPhotoRefreshOnlyForMiniAppVisits(t *testing.T) {
	for _, referrals := range []bool{false, true} {
		repo := &photoRepo{user: model.User{ID: "self", TelegramID: 42}}
		service := NewService(repo)
		archive := &archiveSpy{}
		service.SetPhotoArchive(archive)
		if referrals {
			service.SetReferralRewards(&referralSpy{})
		}
		if _, _, err := service.UpsertWithReferral(context.Background(), CreateUserRequest{TelegramID: 42}, ""); err != nil || archive.visited != "" || archive.scheduled != "self" {
			t.Fatal("bot update must only schedule initial sync", err)
		}
		for _, photo := range []string{"", "https://t.me/avatar.svg"} {
			archive.visited = ""
			if _, _, err := service.UpsertWithReferral(context.Background(), CreateUserRequest{TelegramID: 42, PhotoURL: &photo}, ""); err != nil || archive.visited != "self" {
				t.Fatal("miniapp visit must request throttled sync even without a photo", err)
			}
		}
	}
}

func (r *photoRepo) GetByID(context.Context, string) (*model.User, error) { return &r.user, nil }
func (r *photoRepo) UpsertProfile(_ context.Context, user *model.User) (bool, error) {
	user.ID = r.user.ID
	return false, nil
}
func (r *photoRepo) UpdatePhotoURL(_ context.Context, id, photo string) error {
	r.writes++
	r.user.PhotoURL = photo
	return nil
}
func TestPhotoSync(t *testing.T) {
	for _, referrals := range []bool{false, true} {
		repo := &photoRepo{user: model.User{ID: "self", TelegramID: 42, PhotoURL: "https://t.me/old.svg"}}
		service := NewService(repo)
		if referrals {
			service.SetReferralRewards(&referralSpy{})
		}
		ctx := context.Background()
		if _, _, err := service.UpsertWithReferral(ctx, CreateUserRequest{TelegramID: 42}, ""); err != nil || repo.writes != 0 {
			t.Fatal("bot update must preserve saved photo", err)
		}
		photo := "https://t.me/i/userpic/new.svg"
		user, _, err := service.UpsertWithReferral(ctx, CreateUserRequest{TelegramID: 42, PhotoURL: &photo}, "")
		if err != nil || user.PhotoURL != photo || repo.writes != 1 || toResponse(user).PhotoURL != photo {
			t.Fatal("photo not propagated", err)
		}
		if _, _, err = service.UpsertWithReferral(ctx, CreateUserRequest{TelegramID: 42, PhotoURL: &photo}, ""); err != nil || repo.writes != 1 {
			t.Fatal("unchanged photo rewritten")
		}
		for _, invalid := range []string{"javascript:alert(1)", "http://t.me/photo", "https://user:password@example.test/a", ""} {
			repo.user.PhotoURL = "https://t.me/old.svg"
			if _, _, err := service.UpsertWithReferral(ctx, CreateUserRequest{TelegramID: 42, PhotoURL: &invalid}, ""); err != nil || repo.user.PhotoURL != "" {
				t.Fatal("unsafe or empty photo not cleared", err)
			}
		}
	}
}
func TestPhotoOnlyUsesSignedTelegramData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &photoRepo{user: model.User{ID: "self", TelegramID: 42}}
	service := NewService(repo)
	service.SetReferralRewards(&referralSpy{})
	router := gin.New()
	router.POST("/user", middleware.Auth("test-token", nil), middleware.RequireTelegram(), NewHandler(service, nil).Save)
	params := url.Values{"user": {`{"id":42,"first_name":"Signed","photo_url":"https://t.me/trusted.svg"}`}}
	var lines []string
	for key := range params {
		lines = append(lines, key+"="+params.Get(key))
	}
	sort.Strings(lines)
	secret := hmac.New(sha256.New, []byte("WebAppData"))
	secret.Write([]byte("test-token"))
	hash := hmac.New(sha256.New, secret.Sum(nil))
	hash.Write([]byte(strings.Join(lines, "\n")))
	params.Set("hash", hex.EncodeToString(hash.Sum(nil)))
	request := httptest.NewRequest("POST", "/user", strings.NewReader(`{"photo_url":"https://attacker.test/forged.svg","telegram_id":99}`))
	request.Header.Set("Authorization", "tma "+params.Encode())
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != 201 || repo.user.PhotoURL != "https://t.me/trusted.svg" {
		t.Fatalf("untrusted photo used: %d %s", response.Code, repo.user.PhotoURL)
	}
}
