package payments

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"image"
	_ "image/jpeg"
	"image/png"
	"io"

	"github.com/google/uuid"
)

const MaxReceiptBytes = 5 << 20

var ErrInvalidReceipt = errors.New("رسید باید تصویر PNG یا JPEG، حداکثر ۵ مگابایت و ۴۰۹۶×۴۰۹۶ پیکسل باشد")

// Re-encode raster pixels: SVG, HTML, animation and embedded metadata are not served.
func normalizeReceipt(source io.Reader) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(source, MaxReceiptBytes+1))
	if err != nil || len(data) > MaxReceiptBytes {
		return nil, ErrInvalidReceipt
	}
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || (format != "png" && format != "jpeg") || cfg.Width < 1 || cfg.Height < 1 || cfg.Width > 4096 || cfg.Height > 4096 || int64(cfg.Width)*int64(cfg.Height) > 12_000_000 {
		return nil, ErrInvalidReceipt
	}
	pixels, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, ErrInvalidReceipt
	}
	var output bytes.Buffer
	if err = png.Encode(&output, pixels); err != nil {
		return nil, err
	}
	if output.Len() > 20<<20 {
		return nil, ErrInvalidReceipt
	}
	return output.Bytes(), nil
}

func (s *Service) uploadManualReceipt(ctx context.Context, id string, source io.Reader) (string, string, error) {
	if s.receiptStorage == nil {
		return "", "", errors.New("receipt storage unavailable")
	}
	data, err := normalizeReceipt(source)
	if err != nil {
		return "", "", err
	}
	sum := sha256.Sum256(data)
	hash := hex.EncodeToString(sum[:])
	key := id + "/" + uuid.NewString() + ".png"
	_, err = s.receiptStorage.Upload(ctx, key, bytes.NewReader(data), int64(len(data)), "image/png")
	if err != nil {
		return "", "", err
	}
	return key, hash, nil
}
