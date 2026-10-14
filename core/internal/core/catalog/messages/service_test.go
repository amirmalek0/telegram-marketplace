package messages

import (
	"context"
	"strings"
	"testing"

	"telegram-marketplace/internal/core/catalog/messages/model"
	"telegram-marketplace/internal/core/catalog/messages/repository"
)

type messageRepositoryStub struct {
	repository.Repository
	message model.DeliveryMessage
	writes  int
}

func (r *messageRepositoryStub) Create(_ context.Context, m *model.DeliveryMessage) error {
	r.message = *m
	r.writes++
	return nil
}

func (r *messageRepositoryStub) GetByID(context.Context, string) (*model.DeliveryMessage, error) {
	m := r.message
	return &m, nil
}

func (r *messageRepositoryStub) Update(ctx context.Context, m *model.DeliveryMessage) error {
	return r.Create(ctx, m)
}

func TestMessageNames(t *testing.T) {
	repo := &messageRepositoryStub{}
	s := NewService(repo, nil)
	ctx := context.Background()
	m, err := s.Create(ctx, CreateRequest{Name: "  راهنمای نصب  ", Content: "متن اصلی"})
	if err != nil || m.Name != "راهنمای نصب" || toResponse(m).Name != m.Name {
		t.Fatalf("create name: message=%+v err=%v", m, err)
	}
	content := "متن جدید"
	m, err = s.Update(ctx, "id", UpdateRequest{Content: &content})
	if err != nil || m.Name != "راهنمای نصب" || m.Content != content {
		t.Fatalf("content-only update: message=%+v err=%v", m, err)
	}
	name := " راهنمای جدید "
	m, err = s.Update(ctx, "id", UpdateRequest{Name: &name})
	if err != nil || m.Name != "راهنمای جدید" || m.Content != content {
		t.Fatalf("name-only update: message=%+v err=%v", m, err)
	}
}

func TestInvalidNamesDoNotWrite(t *testing.T) {
	for _, name := range []string{"", " \t\n", strings.Repeat("ن", 121)} {
		repo := &messageRepositoryStub{message: model.DeliveryMessage{Name: "نام قبلی"}}
		s := NewService(repo, nil)
		if _, err := s.Create(context.Background(), CreateRequest{Name: name, Content: "text"}); err == nil {
			t.Errorf("create accepted invalid name %q", name)
		}
		if _, err := s.Update(context.Background(), "id", UpdateRequest{Name: &name}); err == nil {
			t.Errorf("update accepted invalid name %q", name)
		}
		if repo.writes != 0 {
			t.Fatal("invalid name was persisted")
		}
	}
	if _, err := normalizeName(strings.Repeat("ن", 120)); err != nil {
		t.Fatalf("120 Persian characters must be accepted: %v", err)
	}
}
