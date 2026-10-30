package settings

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"mime/multipart"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestWidgetImageUploadAndPublicRead(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, format := range []string{"png", "jpeg"} {
		t.Run(format, func(t *testing.T) {
			store, logos, repo := &logoStore{}, &logoStore{}, &fakeRepository{}
			svc := NewService(repo)
			svc.SetImageStorage(store)
			svc.SetLogoStorage(logos)
			r := gin.New()
			h := NewHandler(svc)
			r.POST("/upload", h.UploadWidgetImage)
			r.GET("/api/v1/miniapp-images/:key", h.WidgetImage)
			var body bytes.Buffer
			form := multipart.NewWriter(&body)
			part, _ := form.CreateFormFile("image", "untrusted-name.svg")
			img := image.NewNRGBA(image.Rect(0, 0, 12, 12))
			if format == "png" {
				png.Encode(part, img)
			} else {
				jpeg.Encode(part, img, nil)
			}
			part.Write([]byte("untrusted appended payload"))
			form.Close()
			req := httptest.NewRequest("POST", "/upload", &body)
			req.Header.Set("Content-Type", form.FormDataContentType())
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			var result struct {
				URL string `json:"url"`
			}
			json.Unmarshal(w.Body.Bytes(), &result)
			if w.Code != 201 || !imagePathPattern.MatchString(result.URL) || store.uploads != 1 || logos.uploads != 0 || repo.last != nil {
				t.Fatalf("upload: %d %s", w.Code, w.Body.String())
			}
			if bytes.Contains(store.data, []byte("untrusted")) {
				t.Fatal("metadata retained")
			}
			w = httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", result.URL, nil))
			if w.Code != 200 || w.Header().Get("Content-Type") != "image/png" || w.Header().Get("X-Content-Type-Options") != "nosniff" || !bytes.Equal(w.Body.Bytes(), store.data) {
				t.Fatal("unsafe public response")
			}
			if _, _, err := svc.OpenLogo(context.Background(), store.key); err == nil {
				t.Fatal("cross-bucket read")
			}
		})
	}
}

func TestWidgetImageRejectsUnsafeOversizedAndTraversal(t *testing.T) {
	var large bytes.Buffer
	png.Encode(&large, image.NewNRGBA(image.Rect(0, 0, 4097, 1)))
	store := &logoStore{}
	svc := NewService(&fakeRepository{})
	svc.SetImageStorage(store)
	for _, data := range [][]byte{nil, []byte("<svg onload='alert(1)'/>"), []byte("not image"), bytes.Repeat([]byte{'a'}, MaxWidgetImageBytes+1), large.Bytes()} {
		if _, err := svc.UploadWidgetImage(context.Background(), bytes.NewReader(data)); !errors.Is(err, ErrInvalidWidgetImage) {
			t.Fatal("invalid image accepted", err)
		}
	}
	if store.uploads != 0 {
		t.Fatal("invalid image stored")
	}
	for _, key := range []string{"../file", "logo.png", "test.svg"} {
		if _, _, err := svc.OpenWidgetImage(context.Background(), key); !errors.Is(err, ErrInvalidWidgetImage) {
			t.Fatal("unsafe key accepted")
		}
	}
}
