package settings

import (
	"context"
	"fmt"
	"regexp"

	"telegram-marketplace/internal/core/settings/model"
	"telegram-marketplace/internal/core/settings/repository"
)

var contentKeyPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{1,119}$`)

type Service struct{ repo repository.Repository }

func NewService(repo repository.Repository) *Service { return &Service{repo: repo} }

func (s *Service) ListContent(ctx context.Context) (*ContentResponse, error) {
	entries, err := s.repo.ListContent(ctx)
	if err != nil {
		return nil, fmt.Errorf("settings.service.ListContent: %w", err)
	}
	result := &ContentResponse{Data: make(map[string]string, len(entries))}
	for _, entry := range entries {
		result.Data[entry.Key] = entry.Value
		if result.UpdatedAt == nil || entry.UpdatedAt.After(*result.UpdatedAt) {
			updatedAt := entry.UpdatedAt
			result.UpdatedAt = &updatedAt
		}
	}
	return result, nil
}

func (s *Service) UpdateContent(ctx context.Context, key, value, adminID string) (*model.ContentEntry, error) {
	if !contentKeyPattern.MatchString(key) {
		return nil, fmt.Errorf("invalid content key")
	}
	if len([]rune(value)) > 4000 {
		return nil, fmt.Errorf("content value is too long")
	}
	if key == "appearance.palette" {
		if err := validatePalette(value); err != nil {
			return nil, err
		}
	}
	entry, err := s.repo.UpsertContent(ctx, key, value, adminID)
	if err != nil {
		return nil, fmt.Errorf("settings.service.UpdateContent: %w", err)
	}
	return entry, nil
}

func (s *Service) ResetContent(ctx context.Context, key string) error {
	if !contentKeyPattern.MatchString(key) {
		return fmt.Errorf("invalid content key")
	}
	if err := s.repo.DeleteContent(ctx, key); err != nil {
		return fmt.Errorf("settings.service.ResetContent: %w", err)
	}
	return nil
}
