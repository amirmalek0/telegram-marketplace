package storage

import (
	"net/url"
	"testing"
)

func TestPublicPresignedURLUsesSameOriginProxy(t *testing.T) {
	store := &S3Client{bucket: "product-files", publicURL: "/storage/product-files"}
	raw := "http://minio:9000/product-files/file-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=signature"

	got, err := store.toPublicURL(raw)
	if err != nil {
		t.Fatalf("toPublicURL returned an error: %v", err)
	}
	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatalf("parse result: %v", err)
	}
	if parsed.Scheme != "" || parsed.Host != "" {
		t.Fatalf("expected a same-origin URL, got %q", got)
	}
	if parsed.Path != "/storage/product-files/file-key" {
		t.Fatalf("unexpected public path %q", parsed.Path)
	}
	if parsed.Query().Get("X-Amz-Signature") != "signature" {
		t.Fatalf("signature query was not preserved: %q", got)
	}
}

func TestPublicPresignedURLSupportsAbsoluteProxy(t *testing.T) {
	store := &S3Client{bucket: "product-files", publicURL: "https://files.example.com/storage/product-files"}
	raw := "http://minio:9000/product-files/file-key?X-Amz-Signature=signature"

	got, err := store.toPublicURL(raw)
	if err != nil {
		t.Fatalf("toPublicURL returned an error: %v", err)
	}
	if got != "https://files.example.com/storage/product-files/file-key?X-Amz-Signature=signature" {
		t.Fatalf("unexpected public URL %q", got)
	}
}
