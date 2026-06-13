package storage

import (
	"context"
	"fmt"
	"io"
	"time"
)

// Provider identifies the object-storage backend to use.
type Provider string

const (
	ProviderMinIO Provider = "minio"
)

// Config holds the provider selection and all credentials needed to
type Config struct {
	Provider  Provider
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	Region    string
	PublicURL string
}

// New constructs the Storage implementation selected by cfg.Provider.
func New(cfg Config) (Storage, error) {
	switch cfg.Provider {
	case ProviderMinIO:
		return NewS3Client(
			cfg.Endpoint,
			cfg.AccessKey,
			cfg.SecretKey,
			cfg.Bucket,
			cfg.Region,
			cfg.PublicURL,
		), nil
	default:
		return nil, fmt.Errorf("storage: unknown provider %q", cfg.Provider)
	}
}

type Storage interface {
	Upload(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error)
	Delete(ctx context.Context, key string) error
	PublicURL(key string) string
	PresignedURL(ctx context.Context, key string, ttl time.Duration) (string, error)
}
