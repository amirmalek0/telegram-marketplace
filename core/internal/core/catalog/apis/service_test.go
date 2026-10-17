package apis

import (
	"context"
	"io"
	"net/http"
	"strings"
	"telegram-marketplace/internal/core/catalog/apis/model"
	"telegram-marketplace/internal/core/catalog/apis/repository"
	"testing"
)

type apiRepoStub struct{ repository.Repository }

func (apiRepoStub) GetByID(context.Context, string) (*model.API, error) {
	return &model.API{URL: "https://provider.example/deliver", Method: "POST", Headers: []model.Header{{Key: "Authorization", Value: "private-secret"}}}, nil
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestDeliveryResponseBoundedAndSecretsNotExposed(t *testing.T) {
	for _, tc := range []struct {
		name, body string
		status     int
		wantError  bool
	}{
		{"success", "content", 200, false},
		{"provider error", "private-secret", 500, true},
		{"oversized", strings.Repeat("x", maxResponseBytes+1), 200, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			s := NewService(apiRepoStub{})
			s.httpClient = &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				if req.Header.Get("Idempotency-Key") != "delivery-item" {
					t.Fatal("missing stable key")
				}
				return &http.Response{StatusCode: tc.status, Body: io.NopCloser(strings.NewReader(tc.body)), Header: make(http.Header)}, nil
			})}
			content, err := s.ExecuteAPICallIdempotent(context.Background(), "api", "delivery-item")
			if (err != nil) != tc.wantError {
				t.Fatal(content, err)
			}
			if err != nil && strings.Contains(err.Error(), "private-secret") {
				t.Fatal("provider secret leaked")
			}
		})
	}
}
