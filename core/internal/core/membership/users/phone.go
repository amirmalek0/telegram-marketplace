package users

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"telegram-marketplace/internal/core/membership/users/model"
)

var ErrInvalidContact = errors.New("contact must belong to its sender in a private chat")
var phonePattern = regexp.MustCompile(`^\+?[1-9][0-9]{6,14}$`)

type TelegramContact struct {
	SenderID, ContactUserID, ChatID            int64
	Private, Forwarded                         bool
	PhoneNumber, FirstName, LastName, Username string
}

// VerifyTelegramContact is called only by the trusted Bot API update consumer.
// A Mini App callback, entered phone, or someone else's contact is not proof.
func (s *Service) VerifyTelegramContact(ctx context.Context, contact TelegramContact) error {
	phone := strings.TrimSpace(contact.PhoneNumber)
	if !contact.Private || contact.Forwarded || contact.SenderID <= 0 || contact.ChatID != contact.SenderID || contact.ContactUserID != contact.SenderID || !phonePattern.MatchString(phone) {
		return ErrInvalidContact
	}
	phone = "+" + strings.TrimPrefix(phone, "+")
	return s.repo.VerifyPhone(ctx, &model.User{TelegramID: contact.SenderID, FirstName: contact.FirstName, LastName: contact.LastName, Username: contact.Username, PhoneNumber: phone})
}

func (s *Service) PhoneVerified(ctx context.Context, telegramID int64) (bool, error) {
	return s.repo.PhoneVerified(ctx, telegramID)
}
