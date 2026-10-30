package settings

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

type logoStore struct {
	data    []byte
	key     string
	uploads int
}

func (s *logoStore) Upload(_ context.Context, key string, r io.Reader, _ int64, mime string) (string, error) {
	if mime != "image/png" {
		return "", errors.New("unsafe MIME")
	}
	s.data, _ = io.ReadAll(r)
	s.key = key
	s.uploads++
	return key, nil
}
func (s *logoStore) Delete(context.Context, string) error { return nil }
func (s *logoStore) PresignedURL(context.Context, string, time.Duration) (string, error) {
	return "", nil
}
func (s *logoStore) Open(_ context.Context, key string) (io.ReadCloser, int64, string, error) {
	if key != s.key {
		return nil, 0, "", errors.New("missing")
	}
	return io.NopCloser(bytes.NewReader(s.data)), int64(len(s.data)), "image/png", nil
}
func TestLogoUploadReencodesAndDoesNotPublish(t *testing.T) {
	for _, format := range []string{"png", "jpeg"} {
		t.Run(format, func(t *testing.T) {
			var input bytes.Buffer
			img := image.NewNRGBA(image.Rect(0, 0, 32, 32))
			if format == "png" {
				png.Encode(&input, img)
			} else {
				jpeg.Encode(&input, img, nil)
			}
			input.WriteString("untrusted appended metadata")
			repo := &fakeRepository{}
			store := &logoStore{}
			svc := NewService(repo)
			svc.SetLogoStorage(store)
			url, err := svc.UploadLogo(context.Background(), &input)
			if err != nil || !logoPathPattern.MatchString(url) || repo.last != nil || store.uploads != 1 {
				t.Fatalf("upload: %q %v", url, err)
			}
			if bytes.Contains(store.data, []byte("untrusted")) {
				t.Fatal("payload retained")
			}
			if _, err := png.Decode(bytes.NewReader(store.data)); err != nil {
				t.Fatal(err)
			}
			gin.SetMode(gin.TestMode)
			r := gin.New()
			r.GET("/api/v1/miniapp-logo/:key", NewHandler(svc).Logo)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", url, nil))
			if w.Code != 200 || w.Header().Get("Content-Type") != "image/png" || w.Header().Get("X-Content-Type-Options") != "nosniff" || !bytes.Equal(w.Body.Bytes(), store.data) {
				t.Fatalf("public image response: %d", w.Code)
			}
		})
	}
}
func TestLogoRejectsUnsafeAndOversizedImages(t *testing.T) {
	var large bytes.Buffer
	png.Encode(&large, image.NewNRGBA(image.Rect(0, 0, 2049, 1)))
	for _, data := range [][]byte{nil, []byte("<svg onload='alert(1)'/>"), []byte("not an image"), bytes.Repeat([]byte{'a'}, MaxLogoBytes+1), large.Bytes()} {
		svc := NewService(&fakeRepository{})
		store := &logoStore{}
		svc.SetLogoStorage(store)
		if _, err := svc.UploadLogo(context.Background(), bytes.NewReader(data)); !errors.Is(err, ErrInvalidLogo) || store.uploads != 0 {
			t.Fatal("invalid image stored")
		}
	}
}
func TestHeaderLogoValidation(t *testing.T) {
	base := `{"version":1,"theme":"classic","layout":"standard","sticky":true,"searchScope":"shop","icons":{"theme":true,"notifications":true,"search":true,"title":true},"actionOrder":["theme","notifications","search"]}`
	for _, value := range []any{"", "/api/v1/miniapp-logo/0c0202be-f760-44ff-8e61-cfbb8e397622.png", "https://bad.test/logo.png", "//bad.test/a", "data:image/svg+xml,a", "/api/v1/miniapp-logo/../../file", nil, 1} {
		logo, _ := json.Marshal(value)
		data := strings.TrimSuffix(base, "}") + `,"logo":` + string(logo) + "}"
		valid := value == "" || value == "/api/v1/miniapp-logo/0c0202be-f760-44ff-8e61-cfbb8e397622.png"
		if (validateHeader(data) == nil) != valid {
			t.Fatalf("unexpected logo validity: %v", value)
		}
	}
}

func TestLogoMultipartHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := &logoStore{}
	svc := NewService(&fakeRepository{})
	svc.SetLogoStorage(store)
	r := gin.New()
	r.POST("/upload", NewHandler(svc).UploadLogo)
	for _, valid := range []bool{true, false} {
		var body bytes.Buffer
		form := multipart.NewWriter(&body)
		part, _ := form.CreateFormFile("logo", "untrusted-name.svg")
		if valid {
			png.Encode(part, image.NewNRGBA(image.Rect(0, 0, 12, 12)))
		} else {
			part.Write([]byte("<svg/>"))
		}
		form.Close()
		req := httptest.NewRequest("POST", "/upload", &body)
		req.Header.Set("Content-Type", form.FormDataContentType())
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if valid && w.Code != 201 {
			t.Fatalf("upload failed: %d %s", w.Code, w.Body.String())
		}
		if !valid && w.Code != 422 {
			t.Fatalf("invalid accepted: %d", w.Code)
		}
	}
	if store.uploads != 1 {
		t.Fatal("invalid multipart file stored")
	}
}
