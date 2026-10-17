package telegram

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) { return fn(request) }

func mockHTTPClient(handler roundTripFunc) *http.Client {
	return &http.Client{Transport: handler}
}

func jsonResponse(body string) *http.Response {
	return &http.Response{StatusCode: http.StatusOK, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(body))}
}

func TestSendReferralMessageUsesPlainText(t *testing.T) {
	message := "Sara <b> received 10 credits thanks to Amir & friends"
	client := NewTestClient("test-token", "http://telegram.test", mockHTTPClient(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/bottest-token/sendMessage" {
			t.Fatal(r.URL.Path)
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		if payload["chat_id"] != float64(42) || payload["text"] != message || payload["parse_mode"] != nil {
			t.Fatalf("unexpected message payload: %+v", payload)
		}
		return jsonResponse(`{"ok":true,"result":{"message_id":1}}`), nil
	}))
	if err := client.SendMessage(context.Background(), 42, message); err != nil {
		t.Fatal(err)
	}
}

func TestCreateInvoiceLinkUsesStarsContract(t *testing.T) {
	client := NewTestClient("test-token", "http://telegram.test", mockHTTPClient(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/bottest-token/createInvoiceLink" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		var request createInvoiceLinkRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if request.Currency != "XTR" || request.ProviderToken != "" {
			t.Fatalf("invalid Stars fields: %+v", request)
		}
		if len(request.Prices) != 1 || request.Prices[0].Amount != 25 {
			t.Fatalf("Stars invoice must contain one price: %+v", request.Prices)
		}
		return jsonResponse(`{"ok":true,"result":"https://t.me/$invoice"}`), nil
	}))
	url, err := client.CreateInvoiceLink(context.Background(), "Product", "Description", "payload", "XTR", 25)
	if err != nil {
		t.Fatalf("CreateInvoiceLink: %v", err)
	}
	if url != "https://t.me/$invoice" {
		t.Fatalf("unexpected URL: %s", url)
	}
}

func TestAPIErrorIsReturned(t *testing.T) {
	client := NewTestClient("test-token", "http://telegram.test", mockHTTPClient(func(_ *http.Request) (*http.Response, error) {
		return jsonResponse(`{"ok":false,"error_code":400,"description":"bad invoice"}`), nil
	}))
	_, err := client.CreateInvoiceLink(context.Background(), "Product", "Description", "payload", "XTR", 25)
	apiErr, ok := err.(*APIError)
	if !ok || apiErr.Code != 400 {
		t.Fatalf("expected APIError 400, got %T %v", err, err)
	}
}
