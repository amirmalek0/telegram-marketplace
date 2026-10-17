package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestInitDataFreshness(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name, date string
		valid      bool
	}{
		{"fresh", strconv.FormatInt(time.Now().Unix(), 10), true},
		{"expired", "1", false}, {"future", "9999999999", false}, {"missing", "", false}, {"malformed", "abc", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := url.Values{"user": {`{"id":42}`}}
			if tc.date != "" {
				p.Set("auth_date", tc.date)
			}
			var lines []string
			for k := range p {
				lines = append(lines, k+"="+p.Get(k))
			}
			sort.Strings(lines)
			secret := hmac.New(sha256.New, []byte("WebAppData"))
			secret.Write([]byte("test-token"))
			hash := hmac.New(sha256.New, secret.Sum(nil))
			hash.Write([]byte(strings.Join(lines, "\n")))
			p.Set("hash", hex.EncodeToString(hash.Sum(nil)))
			r := gin.New()
			r.GET("/", Auth("test-token", nil), func(c *gin.Context) { c.Status(204) })
			call := func(raw string) int {
				w := httptest.NewRecorder()
				req := httptest.NewRequest("GET", "/", nil)
				req.Header.Set("Authorization", "tma "+raw)
				r.ServeHTTP(w, req)
				return w.Code
			}
			want := 401
			if tc.valid {
				want = 204
			}
			if code := call(p.Encode()); code != want {
				t.Fatalf("got %d want %d", code, want)
			}
			if tc.valid && call(p.Encode()+"&user=forged") != 401 {
				t.Fatal("duplicate signed keys accepted")
			}
		})
	}
}
