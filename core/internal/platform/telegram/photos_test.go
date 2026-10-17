package telegram

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestProfilePhotosPagination(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req map[string]int64
		_ = json.NewDecoder(r.Body).Decode(&req)
		if r.URL.Path != "/bottest-token/getUserProfilePhotos" || req["user_id"] != 42 || req["offset"] != 100 || req["limit"] != 100 {
			t.Errorf("wrong request: %s %+v", r.URL.Path, req)
		}
		fmt.Fprint(w, `{"ok":true,"result":{"total_count":101,"photos":[[{"file_id":"file","file_unique_id":"unique","width":640,"height":640}]]}}`)
	}))
	defer server.Close()
	result, err := NewTestClient("test-token", server.URL, server.Client()).GetProfilePhotos(context.Background(), 42, 100)
	if err != nil || result.Total != 101 || result.Photos[0][0].UniqueID != "unique" {
		t.Fatal(result, err)
	}
}
func TestDownloadProfilePhotoValidation(t *testing.T) {
	for _, test := range []struct {
		name, path, body string
		redirect, ok     bool
	}{
		{name: "jpeg", path: "photos/file.jpg", body: "\xff\xd8\xff\xe0jpeg", ok: true},
		{name: "svg", path: "photos/file.svg", body: `<svg xmlns="http://www.w3.org/2000/svg"/>`},
		{name: "traversal", path: "../secret"}, {name: "encoded traversal", path: "photos/%2e%2e/secret"}, {name: "external", path: "https://external.test/a"},
		{name: "redirect", path: "photos/a.jpg", redirect: true},
		{name: "oversize", path: "photos/a.jpg", body: strings.Repeat("x", 10*1024*1024+1)},
	} {
		t.Run(test.name, func(t *testing.T) {
			externalHits := 0
			external := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { externalHits++ }))
			defer external.Close()
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if strings.HasSuffix(r.URL.Path, "/getFile") {
					_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "result": map[string]string{"file_path": test.path}})
					return
				}
				if test.redirect {
					http.Redirect(w, r, external.URL, 302)
					return
				}
				fmt.Fprint(w, test.body)
			}))
			defer server.Close()
			data, kind, err := NewTestClient("private-token", server.URL, server.Client()).DownloadProfilePhoto(context.Background(), "file")
			if test.ok && (err != nil || len(data) == 0 || kind != "image/jpeg") {
				t.Fatal(kind, err)
			}
			if !test.ok && err == nil {
				t.Fatal("unsafe response accepted")
			}
			if externalHits != 0 {
				t.Fatal("followed redirect")
			}
			if err != nil && strings.Contains(err.Error(), "private-token") {
				t.Fatal("token leaked")
			}
		})
	}
}
