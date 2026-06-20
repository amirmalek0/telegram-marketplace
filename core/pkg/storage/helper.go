package storage

import (
	"context"
	"fmt"
	"mime/multipart"

	"github.com/google/uuid"
)

// UploadFile opens a *multipart.FileHeader, detects its content-type, and
func UploadFile(ctx context.Context, store Storage, fh *multipart.FileHeader) (string, error) {
	f, err := fh.Open()
	if err != nil {
		return "", fmt.Errorf("storage.UploadFile: open: %w", err)
	}
	defer f.Close()

	contentType := fh.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	key := uuid.New().String()

	storedKey, err := store.Upload(ctx, key, f, fh.Size, contentType)
	if err != nil {
		return "", fmt.Errorf("storage.UploadFile: upload: %w", err)
	}

	return storedKey, nil
}

// DeleteFile removes an object from storage by its key.
func DeleteFile(ctx context.Context, store Storage, key string) error {
	if key == "" {
		return nil
	}
	if err := store.Delete(ctx, key); err != nil {
		return fmt.Errorf("storage.DeleteFile: %w", err)
	}
	return nil
}
