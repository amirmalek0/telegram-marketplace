package settings

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"telegram-marketplace/internal/core/settings/model"
	"telegram-marketplace/internal/core/settings/repository"
	"telegram-marketplace/pkg/storage"
)

var contentKeyPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{1,119}$`)

type Service struct {
	repo         repository.Repository
	logoStorage  storage.Storage
	imageStorage storage.Storage
}

func NewService(repo repository.Repository) *Service { return &Service{repo: repo} }

func (s *Service) SetLogoStorage(store storage.Storage)  { s.logoStorage = store }
func (s *Service) SetImageStorage(store storage.Storage) { s.imageStorage = store }

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
	if (!strings.HasPrefix(key, "appearance.page.") && !strings.HasPrefix(key, globalWidgetPrefix) && len([]rune(value)) > 4000) || len(value) > 262144 {
		return nil, fmt.Errorf("content value is too long")
	}
	if key == "appearance.checkout" {
		if err := validateCheckoutPresentation(value); err != nil {
			return nil, err
		}
	}
	if key == "appearance.palette" {
		if err := validatePalette(value); err != nil {
			return nil, err
		}
	}
	if key == "appearance.header" {
		if err := validateHeader(value); err != nil {
			return nil, err
		}
	}
	if key == "appearance.navigation" {
		if err := validateNavigation(value); err != nil {
			return nil, err
		}
	}
	if key == "appearance.shop_sections" {
		if err := validateShopArrangement(value); err != nil {
			return nil, err
		}
	}
	if key == "appearance.shop_designs" {
		if err := validateShopDesigns(value); err != nil {
			return nil, err
		}
	}
	if strings.HasPrefix(key, "appearance.page.") {
		if err := validatePageLayout(key, value); err != nil {
			return nil, err
		}
	}
	if strings.HasPrefix(key, globalWidgetPrefix) {
		if _, err := validateGlobalWidget(key, value); err != nil {
			return nil, err
		}
	}
	if strings.HasPrefix(key, "appearance.page.") || strings.HasPrefix(key, globalWidgetPrefix) {
		return s.repo.MutateContent(ctx, key, &value, adminID, func(entries []model.ContentEntry) error { return validateGlobalMutation(entries, key, &value) })
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
	if strings.HasPrefix(key, "appearance.page.") || strings.HasPrefix(key, globalWidgetPrefix) {
		_, err := s.repo.MutateContent(ctx, key, nil, "", func(entries []model.ContentEntry) error { return validateGlobalMutation(entries, key, nil) })
		return err
	}
	if err := s.repo.DeleteContent(ctx, key); err != nil {
		return fmt.Errorf("settings.service.ResetContent: %w", err)
	}
	return nil
}
