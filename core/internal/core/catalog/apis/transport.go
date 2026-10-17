package apis

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"time"
)

var errUnsafeEndpoint = errors.New("API delivery requires a public HTTPS endpoint")

const maxResponseBytes = 2 << 20

func validateEndpoint(raw string) error {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.Fragment != "" || (u.Port() != "" && u.Port() != "443") {
		return errUnsafeEndpoint
	}
	if ip, err := netip.ParseAddr(u.Hostname()); err == nil && !publicAddress(ip) {
		return errUnsafeEndpoint
	}
	return nil
}
func publicAddress(ip netip.Addr) bool {
	ip = ip.Unmap()
	if ip.Is6() && !netip.MustParsePrefix("2000::/3").Contains(ip) {
		return false
	}
	if !ip.IsGlobalUnicast() || ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
		return false
	}
	// Includes shared address space, metadata, documentation and transition ranges.
	for _, raw := range []string{"0.0.0.0/8", "100.64.0.0/10", "192.0.0.0/24", "192.0.2.0/24", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "240.0.0.0/4", "2001::/23", "2001:db8::/32", "2002::/16", "3fff::/20", "64:ff9b::/96", "64:ff9b:1::/48"} {
		if netip.MustParsePrefix(raw).Contains(ip) {
			return false
		}
	}
	return true
}
func safeHTTPClient() *http.Client {
	transport := &http.Transport{
		Proxy: nil, TLSHandshakeTimeout: 10 * time.Second, ResponseHeaderTimeout: 20 * time.Second,
		MaxResponseHeaderBytes: 64 << 10, DisableKeepAlives: true,
		DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(address)
			if err != nil {
				return nil, errUnsafeEndpoint
			}
			ips, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
			if err != nil {
				return nil, errUnsafeEndpoint
			}
			if len(ips) == 0 {
				return nil, errUnsafeEndpoint
			}
			for _, ip := range ips {
				if !publicAddress(ip) {
					return nil, errUnsafeEndpoint
				}
			}
			// Dial the checked address directly: no second DNS lookup/rebinding window.
			dialer := net.Dialer{Timeout: 10 * time.Second}
			return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
		}}
	return &http.Client{Transport: transport, Timeout: 30 * time.Second,
		// Redirects could leak configured authorization headers to a different host.
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
}
