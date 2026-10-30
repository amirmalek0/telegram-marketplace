package settings

import (
	"context"
	"errors"
	"io"
	"telegram-marketplace/pkg/storage"
)

const MaxWidgetImageBytes = 5 << 20

var ErrInvalidWidgetImage = errors.New("تصویر باید PNG یا JPEG معتبر، حداکثر ۵ مگابایت و ۴۰۹۶×۴۰۹۶ پیکسل باشد")

func (s *Service) UploadWidgetImage(ctx context.Context, source io.Reader) (string, error) {
	return uploadRaster(ctx, source, s.imageStorage, MaxWidgetImageBytes, 4096, "/api/v1/miniapp-images/", ErrInvalidWidgetImage)
}
func (s *Service) OpenWidgetImage(ctx context.Context, key string) (io.ReadCloser, int64, error) {
	if !imagePathPattern.MatchString("/api/v1/miniapp-images/" + key) {
		return nil, 0, ErrInvalidWidgetImage
	}
	reader, ok := s.imageStorage.(storage.Reader)
	if !ok {
		return nil, 0, errors.New("image storage unavailable")
	}
	body, size, mime, err := reader.Open(ctx, key)
	if err != nil {
		return nil, 0, err
	}
	if mime != "image/png" {
		body.Close()
		return nil, 0, ErrInvalidWidgetImage
	}
	return body, size, nil
}
