package payments

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"telegram-marketplace/internal/core/commerce/payments/model"
	repo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/pkg/pagination"
	"testing"
)

type adminPaymentRepo struct {
	repo.Repository
	rows                []model.AdminPayment
	summary             model.Summary
	listErr, summaryErr error
	limit, offset       int
}

func (r *adminPaymentRepo) ListAdminByMethod(_ context.Context, method model.PaymentMethod, limit, offset int) ([]model.AdminPayment, error) {
	if method != model.MethodTelegramStars {
		panic("unexpected method")
	}
	r.limit, r.offset = limit, offset
	return r.rows, r.listErr
}
func (r *adminPaymentRepo) AdminSummary(_ context.Context, method model.PaymentMethod) (*model.Summary, error) {
	return &r.summary, r.summaryErr
}
func TestAdminPaymentResponse(t *testing.T) {
	r := &adminPaymentRepo{rows: []model.AdminPayment{{Payment: model.Payment{ID: "payment", ProviderData: []byte(`{"secret":"hidden"}`)}, User: &model.Payer{ID: "user", TelegramID: 42}, TargetTitle: "Product", CouponCode: "SAVE", DiscountStars: 2}}, summary: model.Summary{Total: 21, PaidStars: 99}}
	service := NewService(r, nil, nil, nil)
	result, err := service.ListStars(context.Background(), pagination.Params{Page: 2, PerPage: 20})
	if err != nil || result.Total != 21 || result.Summary.PaidStars != 99 || len(result.Data) != 1 || r.limit != 20 || r.offset != 20 {
		t.Fatalf("result: %+v %v", result, err)
	}
	if result.Data[0].User.ID != "user" || result.Data[0].TargetTitle != "Product" || result.Data[0].CouponCode != "SAVE" {
		t.Fatal("missing admin enrichment")
	}
	raw, err := json.Marshal(result)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "provider_data") || strings.Contains(string(raw), "hidden") {
		t.Fatal("provider data leaked")
	}
	regular, _ := json.Marshal(toResponse(&r.rows[0].Payment))
	if strings.Contains(string(regular), "\"user\"") || strings.Contains(string(regular), "target_title") {
		t.Fatal("admin enrichment leaked to base response")
	}
	r.listErr = errors.New("list unavailable")
	if _, err := service.ListStars(context.Background(), pagination.Params{Page: 1, PerPage: 20}); err == nil {
		t.Fatal("list failure hidden")
	}
	r.listErr = nil
	r.summaryErr = errors.New("summary unavailable")
	if _, err := service.ListStars(context.Background(), pagination.Params{Page: 1, PerPage: 20}); err == nil {
		t.Fatal("summary failure hidden")
	}
	r.summaryErr = nil
	r.rows = nil
	r.summary = model.Summary{}
	result, err = service.ListStars(context.Background(), pagination.Params{Page: 1, PerPage: 20})
	if err != nil || result.Data == nil || len(result.Data) != 0 {
		t.Fatal("empty list must be array")
	}
}
