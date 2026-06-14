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

// Config holds the provider selection and credentials needed to connect to the
// object-storage backend. Bucket names are intentionally absent here; each
// domain (categories icons, product files, …) obtains its own bucket-scoped
// Storage by calling Client.Bucket after construction.
type Config struct {
	Provider  Provider
	Endpoint  string
	AccessKey string
	SecretKey string
	Region    string
}

// New constructs the storage Client selected by cfg.Provider.
// The returned *Client is a connection-level factory; call Bucket on it to
// obtain a Storage scoped to a specific bucket.
func New(cfg Config) (*Client, error) {
	switch cfg.Provider {
	case ProviderMinIO:
		return NewClient(
			cfg.Endpoint,
			cfg.AccessKey,
			cfg.SecretKey,
			cfg.Region,
		), nil
	default:
		return nil, fmt.Errorf("storage: unknown provider %q", cfg.Provider)
	}
}

// Storage is the per-bucket interface used by domain services.
type Storage interface {
	Upload(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error)
	Delete(ctx context.Context, key string) error
	PublicURL(key string) string
	PresignedURL(ctx context.Context, key string, ttl time.Duration) (string, error)
}
