package auth

import (
	"context"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"telegram-marketplace/internal/core/membership/admins/model"
	"telegram-marketplace/internal/core/membership/admins/repository"
	"testing"
	"time"
)

type adminStub struct {
	repository.Repository
	admin *model.Admin
}

func (r *adminStub) FindByUsername(context.Context, string) (*model.Admin, error) {
	return r.admin, nil
}
func (r *adminStub) FindByID(context.Context, string) (*model.Admin, error) { return r.admin, nil }

type sessionsStub struct {
	id, refresh string
	valid       bool
}

func (r *sessionsStub) Create(_ context.Context, id, admin, refresh string, _ time.Time) error {
	r.id = id
	r.refresh = refresh
	r.valid = true
	return nil
}
func (r *sessionsStub) Valid(_ context.Context, id, admin string) (bool, error) {
	return r.valid && id == r.id, nil
}
func (r *sessionsStub) Revoke(context.Context, string, string) error { r.valid = false; return nil }
func (r *sessionsStub) Rotate(_ context.Context, id, admin, old, next string, _ time.Time) (bool, error) {
	if !r.valid || old != r.refresh {
		return false, nil
	}
	r.refresh = next
	return true, nil
}
func TestSessionPurposeRevocationAndRefreshRotation(t *testing.T) {
	ctx := context.Background()
	hash, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.MinCost)
	repo := &adminStub{admin: &model.Admin{ID: uuid.NewString(), PasswordHash: string(hash), IsActive: true}}
	s := NewService(repo, "test-only-secret", &sessionsStub{})
	pair, err := s.Login(ctx, "admin", "password")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.ValidateAccessToken(ctx, pair.AccessToken); err != nil {
		t.Fatal(err)
	}
	if _, err = s.ValidateAccessToken(ctx, pair.RefreshToken); err == nil {
		t.Fatal("refresh accepted as access")
	}
	if _, err = s.Refresh(ctx, pair.AccessToken); err == nil {
		t.Fatal("access accepted as refresh")
	}
	next, err := s.Refresh(ctx, pair.RefreshToken)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Refresh(ctx, pair.RefreshToken); err == nil {
		t.Fatal("refresh replay accepted")
	}
	repo.admin.IsActive = false
	if _, err = s.ValidateAccessToken(ctx, next.AccessToken); err == nil {
		t.Fatal("disabled admin accepted")
	}
	repo.admin.IsActive = true
	repo.admin.PasswordHash = "changed"
	if _, err = s.ValidateAccessToken(ctx, next.AccessToken); err == nil {
		t.Fatal("password change did not revoke")
	}
	repo.admin.PasswordHash = string(hash)
	if err = s.Logout(ctx, next.RefreshToken); err != nil {
		t.Fatal(err)
	}
	if _, err = s.ValidateAccessToken(ctx, next.AccessToken); err == nil {
		t.Fatal("logged-out session accepted")
	}
	if _, err = s.Refresh(ctx, next.RefreshToken); err == nil {
		t.Fatal("logged-out refresh accepted")
	}
}
func TestAttemptLimiter(t *testing.T) {
	l := newAttemptLimiter()
	for i := 0; i < 10; i++ {
		if !l.allow("user:test", 10) {
			t.Fatal("early throttle")
		}
	}
	if l.allow("user:test", 10) {
		t.Fatal("no throttle")
	}
	l.entries["user:test"] = attempt{10, time.Now().Add(-time.Second)}
	if !l.allow("user:test", 10) {
		t.Fatal("window did not reset")
	}
}
