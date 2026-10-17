package referrals

import (
	"context"
	"errors"
	"telegram-marketplace/internal/core/membership/referrals/model"
	"telegram-marketplace/internal/core/membership/referrals/repository"
	"testing"
)

type fakeRepo struct {
	repository.Repository
	code      string
	rewards   int
	saved     bool
	rewardErr error
}

func (r *fakeRepo) Onboard(_ context.Context, _ int64, _, _, _, code string) (string, bool, error) {
	r.code = code
	return "id", true, nil
}
func (r *fakeRepo) Reward(context.Context, int64) error { r.rewards++; return r.rewardErr }
func (r *fakeRepo) SaveSettings(context.Context, model.Settings, string) error {
	r.saved = true
	return nil
}
func (r *fakeRepo) Settings(context.Context) (model.Settings, error) {
	return model.Settings{InviterMessage: model.DefaultInviterMessage, InviteeMessage: model.DefaultInviteeMessage}, nil
}

func TestStartPayloadValidation(t *testing.T) {
	code := "0123456789abcdef0123456789abcdef"
	for _, input := range []string{"ref_" + code, "", code, "ref_bad", "ref_" + code + "&other=1", "https://t.me/bot?start=ref_" + code} {
		r := &fakeRepo{}
		s := NewService(r, nil)
		if _, _, err := s.Onboard(context.Background(), 42, "First", "", "", input); err != nil {
			t.Fatal(err)
		}
		want := ""
		if input == "ref_"+code {
			want = code
		}
		if r.code != want {
			t.Fatal("unvalidated payload accepted", input)
		}
	}
}
func TestRewardFailureDoesNotFailOnboarding(t *testing.T) {
	r := &fakeRepo{rewardErr: errors.New("retry later")}
	s := NewService(r, nil)
	if _, _, err := s.Onboard(context.Background(), 42, "First", "", "", ""); err != nil || r.rewards != 1 {
		t.Fatal("reward failure escaped", err)
	}
}
func TestSettingsValidation(t *testing.T) {
	for _, trigger := range []string{"bot_open", "phone_verified", "first_purchase", "invalid"} {
		for _, amount := range []int64{-1, 0, 10, 1000000, 1000001} {
			r := &fakeRepo{}
			s := NewService(r, nil)
			err := s.SaveSettings(context.Background(), model.Settings{RewardTrigger: trigger, InviterStars: amount, InviteeStars: amount}, "admin")
			valid := trigger != "invalid" && amount >= 0 && amount <= 1000000
			if (err == nil) != valid || r.saved != valid {
				t.Fatalf("invalid settings accepted: %s %d", trigger, amount)
			}
		}
	}
}
