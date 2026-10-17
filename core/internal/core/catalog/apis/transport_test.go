package apis

import (
	"context"
	"net/http"
	"net/netip"
	"testing"
)

func TestUnsafeDestinationsBlocked(t *testing.T) {
	for _, raw := range []string{"http://example.com", "https://localhost:9000", "https://127.0.0.1", "https://[::1]", "https://169.254.169.254", "https://100.100.100.200", "https://user:secret@example.com", "file:///etc/passwd", "https://example.com:444"} {
		if validateEndpoint(raw) == nil {
			t.Errorf("allowed %s", raw)
		}
	}
	for _, raw := range []string{"127.0.0.1", "::1", "10.0.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::ffff:127.0.0.1", "2001:db8::1", "64:ff9b::7f00:1"} {
		if publicAddress(netip.MustParseAddr(raw)) {
			t.Errorf("allowed address %s", raw)
		}
	}
	if validateEndpoint("https://example.com/api") != nil || !publicAddress(netip.MustParseAddr("8.8.8.8")) {
		t.Fatal("public endpoint rejected")
	}
	client := safeHTTPClient()
	req, _ := http.NewRequest("GET", "https://example.com", nil)
	if client.CheckRedirect(req, nil) != http.ErrUseLastResponse {
		t.Fatal("redirect allowed")
	}
	transport := client.Transport.(*http.Transport)
	if _, err := transport.DialContext(context.Background(), "tcp", "localhost:443"); err == nil {
		t.Fatal("DNS loopback allowed")
	}
}
