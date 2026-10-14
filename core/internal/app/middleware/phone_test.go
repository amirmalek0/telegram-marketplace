package middleware

import (
	"context"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"telegram-marketplace/internal/core/membership/auth"
	"testing"
)

type phonePolicyStub struct {
	required bool
	err      error
}

func (p phonePolicyStub) PhoneVerificationRequired(context.Context) (bool, error) {
	return p.required, p.err
}

type phoneIdentityStub struct {
	verified bool
	err      error
	id       int64
	calls    int
}

func (u *phoneIdentityStub) PhoneVerified(_ context.Context, id int64) (bool, error) {
	u.id = id
	u.calls++
	return u.verified, u.err
}

func TestPhoneGate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name                                 string
		required, verified, admin, anonymous bool
		policyErr, userErr                   error
		status                               int
	}{
		{name: "disabled", status: 200},
		{name: "required unverified", required: true, status: 403},
		{name: "required verified", required: true, verified: true, status: 200},
		{name: "admin bypass", required: true, admin: true, policyErr: errors.New("db down"), status: 200},
		{name: "anonymous", anonymous: true, status: 401},
		{name: "settings failure fails closed", policyErr: errors.New("db down"), status: 503},
		{name: "user lookup failure fails closed", required: true, userErr: errors.New("db down"), status: 503},
	} {
		t.Run(tc.name, func(t *testing.T) {
			identity := &phoneIdentityStub{verified: tc.verified, err: tc.userErr}
			r := gin.New()
			r.Use(func(c *gin.Context) {
				if tc.admin {
					c.Set(AdminClaimsKey, &auth.Claims{})
				} else if !tc.anonymous {
					c.Set(InitDataKey, url.Values{"user": {`{"id":42}`}})
				}
			}, RequireVerifiedPhone(phonePolicyStub{tc.required, tc.policyErr}, identity))
			r.GET("/product", func(c *gin.Context) { c.Status(200) })
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/product", nil))
			if w.Code != tc.status {
				t.Fatalf("got %d: %s", w.Code, w.Body.String())
			}
			if w.Code == 403 && !strings.Contains(w.Body.String(), "PHONE_VERIFICATION_REQUIRED") {
				t.Fatal("missing machine-readable code")
			}
			if identity.calls > 0 && identity.id != 42 {
				t.Fatal("did not check authenticated user")
			}
			if (!tc.required || tc.admin) && identity.calls > 0 {
				t.Fatal("unnecessary identity check")
			}
		})
	}
}
