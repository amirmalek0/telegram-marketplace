package settings

import (
	"bytes"
	"context"
	"errors"
	"image"
	_ "image/jpeg"
	"image/png"
	"io"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"telegram-marketplace/pkg/storage"
)

const MaxLogoBytes = 2 << 20

var logoPathPattern = regexp.MustCompile(`^/api/v1/miniapp-logo/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$`)
var ErrInvalidLogo = errors.New("لوگو باید تصویر PNG یا JPEG معتبر، حداکثر ۲ مگابایت و ۲۰۴۸×۲۰۴۸ پیکسل باشد")

// UploadLogo stores an immutable public branding asset, not a published setting.
// Header save selects the asset. Old assets remain valid for other drafts/caches.
func (s *Service) UploadLogo(ctx context.Context, source io.Reader) (string, error) {
	return uploadRaster(ctx, source, s.logoStorage, MaxLogoBytes, 2048, "/api/v1/miniapp-logo/", ErrInvalidLogo)
}

func uploadRaster(ctx context.Context, source io.Reader, store storage.Storage, maxBytes int64, maxSide int, prefix string, invalid error) (string, error) {
	data, err := io.ReadAll(io.LimitReader(source, maxBytes+1))
	if err != nil || len(data) == 0 || int64(len(data)) > maxBytes {
		return "", invalid
	}
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || (format != "png" && format != "jpeg") || cfg.Width < 1 || cfg.Height < 1 || cfg.Width > maxSide || cfg.Height > maxSide {
		return "", invalid
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return "", invalid
	}
	// Re-encode to discard metadata, appended payloads and untrusted MIME headers.
	var clean bytes.Buffer
	if err := png.Encode(&clean, img); err != nil {
		return "", invalid
	}
	if store == nil {
		return "", errors.New("image storage unavailable")
	}
	key := uuid.NewString() + ".png"
	// S3 signing and retries need to rewind the sanitized image body.
	if _, err := store.Upload(ctx, key, bytes.NewReader(clean.Bytes()), int64(clean.Len()), "image/png"); err != nil {
		return "", err
	}
	return prefix + key, nil
}

func (s *Service) OpenLogo(ctx context.Context, key string) (io.ReadCloser, int64, error) {
	if !logoPathPattern.MatchString("/api/v1/miniapp-logo/" + key) {
		return nil, 0, ErrInvalidLogo
	}
	reader, ok := s.logoStorage.(storage.Reader)
	if !ok {
		return nil, 0, errors.New("logo storage unavailable")
	}
	body, size, mime, err := reader.Open(ctx, key)
	if err != nil {
		return nil, 0, err
	}
	if !strings.EqualFold(mime, "image/png") {
		body.Close()
		return nil, 0, ErrInvalidLogo
	}
	return body, size, nil
}
