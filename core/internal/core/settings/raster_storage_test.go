package settings

import (
	"bytes"
	"context"
	"image"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"telegram-marketplace/pkg/storage"
)

// Exercise the real S3 signing/upload path, which an in-memory Storage fake
// cannot cover. In particular, the SDK must be able to rewind the PNG body.
func TestRasterUploadsThroughS3(t *testing.T) {
	for _, kind := range []string{"logo", "widget"} {
		t.Run(kind, func(t *testing.T) {
			var stored []byte
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodPut || !strings.HasPrefix(r.URL.Path, "/images/") || r.Header.Get("Content-Type") != "image/png" {
					t.Errorf("unexpected upload: %s %s", r.Method, r.URL.Path)
					w.WriteHeader(http.StatusBadRequest)
					return
				}
				var err error
				stored, err = io.ReadAll(r.Body)
				if err != nil {
					t.Error(err)
				}
				w.WriteHeader(http.StatusOK)
			}))
			defer server.Close()
			store := storage.NewClient(server.URL, "test-access", "test-secret", "us-east-1").Bucket("images", "")
			svc := NewService(&fakeRepository{})
			svc.SetLogoStorage(store)
			svc.SetImageStorage(store)
			var input bytes.Buffer
			if err := png.Encode(&input, image.NewNRGBA(image.Rect(0, 0, 16, 16))); err != nil {
				t.Fatal(err)
			}
			upload := svc.UploadLogo
			if kind == "widget" {
				upload = svc.UploadWidgetImage
			}
			if _, err := upload(context.Background(), &input); err != nil {
				t.Fatalf("S3 upload failed: %v", err)
			}
			if _, err := png.Decode(bytes.NewReader(stored)); err != nil {
				t.Fatalf("stored image is not a PNG: %v", err)
			}
		})
	}
}
