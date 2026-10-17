package coupons

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/coupons/model"
	"telegram-marketplace/internal/core/commerce/coupons/repository"
)

type scopeRepository struct {
	repository.Repository
	coupon *model.Coupon
	caller int64
}

func (r *scopeRepository) GetByCode(context.Context, string) (*model.Coupon, error) {
	return r.coupon, nil
}
func (r *scopeRepository) UserID(_ context.Context, id int64) (string, error) {
	r.caller = id
	return "actual-user", nil
}
func (r *scopeRepository) ProductStars(context.Context, string) (int64, error) { return 20, nil }

func TestValidateUsesAuthenticatedUserNotPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	coupon := model.NewCoupon("PRIVATE", model.DiscountTypeStatic, 5, 0, nil, nil)
	coupon.UserIDs = []string{"target-user"}
	repo := &scopeRepository{coupon: coupon}
	handler := NewHandler(NewService(repo))
	for _, authenticated := range []bool{false, true} {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		if authenticated {
			c.Set(middleware.InitDataKey, url.Values{"user": []string{`{"id":43}`}})
		}
		c.Request = httptest.NewRequest(http.MethodPost, "/coupon/validate", strings.NewReader(`{"code":"PRIVATE","product_id":"`+uuid.NewString()+`","user_id":"target-user","user_ids":["target-user"],"telegram_id":42}`))
		c.Request.Header.Set("Content-Type", "application/json")
		handler.Validate(c)
		if !authenticated {
			if w.Code != http.StatusUnauthorized {
				t.Fatal("missing auth accepted", w.Code)
			}
			continue
		}
		var result ValidateResponse
		if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if w.Code != http.StatusOK || result.Valid || repo.caller != 43 || result.Message != model.ErrCouponUserNotApplicable.Error() {
			t.Fatalf("spoof accepted: %d %s caller=%d", w.Code, w.Body.String(), repo.caller)
		}
		if strings.Contains(w.Body.String(), "user_ids") || strings.Contains(w.Body.String(), "target-user") {
			t.Fatal("audience leaked")
		}
	}
}

func TestCouponUserAndProductScope(t *testing.T) {
	c := model.NewCoupon("TEST", model.DiscountTypeStatic, 5, 0, nil, []string{"product"})
	if err := c.Validate("product", "any-user"); err != nil {
		t.Fatal(err)
	}
	c.UserIDs = []string{"one", "two"}
	for _, user := range []string{"one", "two"} {
		if err := c.Validate("product", user); err != nil {
			t.Fatal(err)
		}
	}
	for _, user := range []string{"", "three"} {
		if err := c.Validate("product", user); err != model.ErrCouponUserNotApplicable {
			t.Fatal("user restriction ignored", err)
		}
	}
	if err := c.Validate("wrong-product", "one"); err != model.ErrCouponProductNotApplicable {
		t.Fatal("product restriction ignored", err)
	}
}
