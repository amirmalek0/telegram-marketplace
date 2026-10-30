package payments

import (
	"telegram-marketplace/internal/core/commerce/payments/model"
	"telegram-marketplace/pkg/pagination"
	"time"
)

type CreateStarsInvoiceRequest struct {
	ProductID  string `json:"product_id" binding:"required,uuid"`
	CouponCode string `json:"coupon_code" binding:"max=64"`
}

type CreateProductCheckoutRequest struct {
	ProductID  string `json:"product_id" binding:"required,uuid"`
	CouponCode string `json:"coupon_code" binding:"max=64"`
	Method     string `json:"method" binding:"required,oneof=telegram_stars wallet"`
}

type CreateVIPCheckoutRequest struct {
	PlanID string `json:"plan_id" binding:"required,uuid"`
	Method string `json:"method" binding:"required,oneof=telegram_stars wallet"`
}

type CreateWalletTopupRequest struct {
	PackID string `json:"pack_id" binding:"required,uuid"`
}

type VIPQuoteRequest struct {
	PlanID string `json:"plan_id" binding:"required,uuid"`
}

type VIPQuoteResponse struct {
	PlanID           string     `json:"plan_id"`
	PlanTitle        string     `json:"plan_title"`
	OriginalStars    int64      `json:"original_stars"`
	CreditStars      int64      `json:"credit_stars"`
	PayableStars     int64      `json:"payable_stars"`
	RemainingDays    int        `json:"remaining_days"`
	IsUpgrade        bool       `json:"is_upgrade"`
	CurrentPlanID    *string    `json:"current_plan_id,omitempty"`
	CurrentPlanTitle string     `json:"current_plan_title,omitempty"`
	CurrentTier      int        `json:"current_tier"`
	TargetTier       int        `json:"target_tier"`
	CurrentExpireAt  *time.Time `json:"current_expire_at,omitempty"`
}

type CreateStarsInvoiceResponse struct {
	OrderID           string `json:"order_id"`
	PaymentID         string `json:"payment_id"`
	InvoiceURL        string `json:"invoice_url"`
	Stars             int64  `json:"stars"`
	SimulationEnabled bool   `json:"simulation_enabled"`
	Completed         bool   `json:"completed"`
	Purpose           string `json:"purpose"`
	WalletBalance     int64  `json:"wallet_balance,omitempty"`
}

type PaymentConfigResponse struct {
	TestMode  bool      `json:"test_mode"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UpdatePaymentConfigRequest struct {
	TestMode *bool `json:"test_mode"`
}

type SimulateStarsPaymentRequest struct {
	PaymentID string `json:"payment_id" binding:"required,uuid"`
	Outcome   string `json:"outcome" binding:"required,oneof=succeeded failed cancelled"`
}

type SimulateStarsPaymentResponse struct {
	OrderID        string `json:"order_id"`
	ReferenceID    string `json:"reference_id"`
	Purpose        string `json:"purpose"`
	Status         string `json:"status"`
	DeliveryStatus string `json:"delivery_status,omitempty"`
	DeliveryError  string `json:"delivery_error,omitempty"`
	WalletBalance  int64  `json:"wallet_balance,omitempty"`
}

type WalletTransactionResponse struct {
	ID            string    `json:"id"`
	Type          string    `json:"type"`
	Amount        int64     `json:"amount"`
	BalanceBefore int64     `json:"balance_before"`
	BalanceAfter  int64     `json:"balance_after"`
	Description   string    `json:"description"`
	CreatedAt     time.Time `json:"created_at"`
}

type WalletResponse struct {
	Balance      int64                       `json:"balance"`
	Transactions []WalletTransactionResponse `json:"transactions"`
}

type WalletTopupPackResponse struct {
	TomanPrice int64     `json:"toman_price"`
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Stars      int64     `json:"stars"`
	Status     string    `json:"status"`
	SortOrder  int       `json:"sort_order"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type CreateWalletTopupPackRequest struct {
	TomanPrice int64  `json:"toman_price" binding:"min=0,max=1000000000"`
	Title      string `json:"title" binding:"required,min=1,max=100"`
	Stars      int64  `json:"stars" binding:"required,min=1,max=100000"`
	Status     string `json:"status" binding:"required,oneof=active inactive"`
	SortOrder  int    `json:"sort_order"`
}

type UpdateWalletTopupPackRequest = CreateWalletTopupPackRequest

type AdminWalletResponse struct {
	PhotoURL         string     `json:"photo_url"`
	PhoneNumber      string     `json:"phone_number"`
	UserID           string     `json:"user_id"`
	FirstName        string     `json:"first_name"`
	LastName         string     `json:"last_name"`
	Username         string     `json:"username"`
	TelegramID       int64      `json:"telegram_id"`
	Balance          int64      `json:"balance"`
	HasActivePlan    bool       `json:"has_active_plan"`
	PlanExpireAt     *time.Time `json:"plan_expire_at,omitempty"`
	TransactionCount int64      `json:"transaction_count"`
}

type AdminWalletDetailResponse struct {
	Wallet       AdminWalletResponse         `json:"wallet"`
	Transactions []WalletTransactionResponse `json:"transactions"`
}

type AdjustWalletRequest struct {
	Amount      int64  `json:"amount" binding:"required"`
	Description string `json:"description" binding:"required,min=2,max=300"`
}

type AdminWalletsPaginatedResponse = pagination.Response[AdminWalletResponse]

type ListDeliveriesQuery struct {
	ProductID string `form:"product_id" binding:"omitempty,uuid"`
}

type DeliveryItemResponse struct {
	Kind        string `json:"kind"`
	Label       string `json:"label"`
	Content     string `json:"content,omitempty"`
	DownloadURL string `json:"download_url,omitempty"`
	FileName    string `json:"file_name,omitempty"`
	MimeType    string `json:"mime_type,omitempty"`
	Size        int64  `json:"size,omitempty"`
}

type DeliveryResponse struct {
	OrderID      string                 `json:"order_id"`
	ProductID    string                 `json:"product_id"`
	ProductTitle string                 `json:"product_title"`
	Status       string                 `json:"status"`
	Error        *string                `json:"error,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	DeliveredAt  *time.Time             `json:"delivered_at,omitempty"`
	Items        []DeliveryItemResponse `json:"items"`
}

// --- Response DTOs ---

// Response represents a payment in API responses.
type Response struct {
	ID                    string     `json:"id"`
	OrderID               *string    `json:"order_id,omitempty"`
	UserID                string     `json:"user_id"`
	Purpose               string     `json:"purpose"`
	TargetID              *string    `json:"target_id,omitempty"`
	Stars                 int64      `json:"stars"`
	CheckoutReference     string     `json:"checkout_reference"`
	ExternalTransactionID *string    `json:"external_transaction_id,omitempty"`
	ProviderTransactionID *string    `json:"provider_transaction_id,omitempty"`
	IsTest                bool       `json:"is_test"`
	Status                string     `json:"status"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
	PaidAt                *time.Time `json:"paid_at,omitempty"`
	RefundedAt            *time.Time `json:"refunded_at,omitempty"`
}

// PaginatedResponse is a paginated list of payment responses.
type PaginatedResponse = pagination.Response[Response]

type AdminResponse struct {
	Response
	User          *model.Payer `json:"user"`
	TargetTitle   string       `json:"target_title"`
	ProductID     *string      `json:"product_id,omitempty"`
	Quantity      int          `json:"quantity"`
	CouponCode    string       `json:"coupon_code,omitempty"`
	DiscountStars int64        `json:"discount_stars"`
	DiscountToman int64        `json:"discount_toman"`
}

type AdminPaginatedResponse struct {
	pagination.Response[AdminResponse]
	Summary *model.Summary `json:"summary"`
}

// toResponse converts a model.Payment to a Response.
func toResponse(p *model.Payment) Response {
	return Response{
		ID:                    p.ID,
		OrderID:               p.OrderID,
		UserID:                p.UserID,
		Purpose:               p.Purpose,
		TargetID:              p.TargetID,
		Stars:                 p.AmountMinor,
		CheckoutReference:     p.CheckoutReference,
		ExternalTransactionID: p.ExternalTransactionID,
		ProviderTransactionID: p.ProviderTransactionID,
		IsTest:                p.IsTest,
		Status:                string(p.Status),
		CreatedAt:             p.CreatedAt,
		UpdatedAt:             p.UpdatedAt,
		PaidAt:                p.PaidAt,
		RefundedAt:            p.RefundedAt,
	}
}
