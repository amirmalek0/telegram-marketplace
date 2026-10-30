package referrals

import (
	"context"
	"errors"
	"log"
	"regexp"
	"sync"
	"time"

	"telegram-marketplace/internal/core/membership/referrals/model"
	"telegram-marketplace/internal/core/membership/referrals/repository"
)

type BotIdentity interface {
	BotUsername(context.Context) (string, error)
}
type Service struct {
	notificationSender notificationSender
	repo               repository.Repository
	bot                BotIdentity
	mu                 sync.Mutex
	username           string
}

func NewService(repo repository.Repository, bot BotIdentity) *Service {
	return &Service{repo: repo, bot: bot}
}

var codePattern = regexp.MustCompile(`^ref_([a-f0-9]{32})$`)
var botPattern = regexp.MustCompile(`^[A-Za-z0-9_]+$`)

// Only call with a trusted Bot API /start payload or validated initData.start_param.
func (s *Service) Onboard(ctx context.Context, tg int64, first, last, username, start string) (string, bool, error) {
	code := ""
	if match := codePattern.FindStringSubmatch(start); len(match) == 2 {
		code = match[1]
	}
	id, created, err := s.repo.Onboard(ctx, tg, first, last, username, code)
	if err == nil {
		s.Check(ctx, tg)
	}
	return id, created, err
}
func (s *Service) Settings(ctx context.Context) (model.Settings, error) { return s.repo.Settings(ctx) }
func (s *Service) SaveSettings(ctx context.Context, config model.Settings, admin string) error {
	if !model.ValidSettings(config) {
		return errors.New("تنظیمات دعوت یا قالب پیام معتبر نیست")
	}
	return s.repo.SaveSettings(ctx, config, admin)
}
func (s *Service) botUsername(ctx context.Context) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.username != "" {
		return s.username, nil
	}
	if s.bot == nil {
		return "", errors.New("bot identity unavailable")
	}
	name, err := s.bot.BotUsername(ctx)
	if err != nil {
		return "", err
	}
	if !botPattern.MatchString(name) {
		return "", errors.New("invalid bot username")
	}
	s.username = name
	return name, nil
}
func (s *Service) Summary(ctx context.Context, tg int64) (*model.Summary, error) {
	s.Check(ctx, tg)
	result, code, err := s.repo.Summary(ctx, tg)
	if err != nil {
		return nil, err
	}
	if result.Enabled {
		name, err := s.botUsername(ctx)
		if err != nil {
			return nil, err
		}
		result.Link = "https://t.me/" + name + "?start=ref_" + code
	}
	return result, nil
}

// Reward failures must never turn an already-paid purchase into a failed API
// response. The durable account/payment facts are retried by the bot worker.
func (s *Service) Check(ctx context.Context, tg int64) {
	if err := s.repo.Reward(ctx, tg); err != nil {
		log.Printf("referral reward pending: %v", err)
	}
}
func (s *Service) Reconcile(ctx context.Context) error {
	settings, err := s.repo.Settings(ctx)
	if err != nil || !settings.Enabled {
		return err
	}
	ids, err := s.repo.Eligible(ctx)
	if err != nil {
		return err
	}
	var failures []error
	for _, id := range ids {
		if err := s.repo.Reward(ctx, id); err != nil {
			failures = append(failures, err)
		}
	}
	return errors.Join(failures...)
}
func (s *Service) Run(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		checkCtx, cancel := context.WithTimeout(ctx, 25*time.Second)
		if err := s.Reconcile(checkCtx); err != nil && !errors.Is(err, context.Canceled) {
			log.Printf("referral reconciliation: %v", err)
		}
		// Already credited rewards still need their notices if referrals are later disabled.
		if err := s.DispatchNotifications(checkCtx); err != nil && !errors.Is(err, context.Canceled) {
			log.Printf("referral notification worker: %v", err)
		}
		cancel()
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
