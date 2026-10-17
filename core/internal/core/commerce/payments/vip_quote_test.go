package payments

import (
	"context"
	"errors"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	repo "telegram-marketplace/internal/core/commerce/payments/repository"
)

type vipQuoteRepo struct {
	repo.Repository
	data repo.VIPQuoteData
	err  error
}

func (r *vipQuoteRepo) GetVIPQuoteData(context.Context, int64, string) (*repo.VIPQuoteData, error) {
	return &r.data, r.err
}

func TestVIPQuoteErrorResponses(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name   string
		err    error
		price  int64
		status int
	}{
		{"available", nil, 130, 200},
		{"missing or inactive", repo.ErrCheckoutUnavailable, 0, 422},
		{"invalid price", nil, 0, 422},
		{"database failure", errors.New("private SQL error details"), 130, 500},
	} {
		t.Run(tc.name, func(t *testing.T) {
			service := NewService(&vipQuoteRepo{data: repo.VIPQuoteData{PlanTitle: "VIP", OriginalStars: tc.price}, err: tc.err}, nil, nil, nil)
			router := gin.New()
			router.POST("/quote", func(c *gin.Context) { c.Set(middleware.InitDataKey, url.Values{"user": {`{"id":42}`}}) }, NewHandler(service).GetVIPQuote)
			request := httptest.NewRequest("POST", "/quote", strings.NewReader(`{"plan_id":"10000000-0000-0000-0000-000000000090"}`))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != tc.status || strings.Contains(response.Body.String(), "private SQL") {
				t.Fatalf("response: %d %s", response.Code, response.Body.String())
			}
			if tc.status == 500 {
				_, err := service.VIPQuote(context.Background(), 42, "plan")
				if !errors.Is(err, tc.err) || !errors.Is(err, ErrVIPQuoteFailed) {
					t.Fatal("database cause not preserved", err)
				}
			}
		})
	}
}

func TestVIPQuoteUpgradeAndRenewal(t *testing.T) {
	current := "current-plan"
	expires := time.Now().Add(15 * 24 * time.Hour)
	r := &vipQuoteRepo{data: repo.VIPQuoteData{PlanTitle: "Higher tier", OriginalStars: 130, TargetTier: 2, CurrentPlanID: &current, CurrentExpireAt: &expires, CurrentPrice: 60, CurrentDuration: 30, CurrentTier: 1}}
	s := NewService(r, nil, nil, nil)
	quote, err := s.VIPQuote(context.Background(), 42, "higher-plan")
	if err != nil || !quote.IsUpgrade || quote.CreditStars < 29 || quote.CreditStars > 30 || quote.PayableStars != 130-quote.CreditStars {
		t.Fatalf("upgrade: %+v %v", quote, err)
	}
	quote, err = s.VIPQuote(context.Background(), 42, current)
	if err != nil || quote.IsUpgrade || quote.PayableStars != 130 {
		t.Fatalf("renewal: %+v %v", quote, err)
	}
}
