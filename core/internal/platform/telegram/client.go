package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const productionBaseURL = "https://api.telegram.org"

// Client implements the small Bot API surface used by checkout and bot updates.
type Client struct {
	token      string
	baseURL    string
	httpClient *http.Client
}

func NewClient(token string) *Client {
	return &Client{
		token:   token,
		baseURL: productionBaseURL,
		httpClient: &http.Client{
			Timeout: 40 * time.Second,
		},
	}
}

// NewTestClient is intentionally exported for deterministic integration tests.
func NewTestClient(token, baseURL string, httpClient *http.Client) *Client {
	return &Client{token: token, baseURL: strings.TrimRight(baseURL, "/"), httpClient: httpClient}
}

type APIError struct {
	Code        int
	Description string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("telegram bot api (%d): %s", e.Code, e.Description)
}

type apiResponse[T any] struct {
	OK          bool   `json:"ok"`
	Result      T      `json:"result"`
	ErrorCode   int    `json:"error_code"`
	Description string `json:"description"`
}

func (c *Client) methodURL(method string) string {
	return fmt.Sprintf("%s/bot%s/%s", c.baseURL, c.token, method)
}

func call[T any](ctx context.Context, c *Client, method string, input any) (T, error) {
	var zero T
	body, err := json.Marshal(input)
	if err != nil {
		return zero, fmt.Errorf("telegram marshal %s: %w", method, err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.methodURL(method), bytes.NewReader(body))
	if err != nil {
		return zero, fmt.Errorf("telegram request %s: %w", method, err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return zero, fmt.Errorf("telegram call %s: %w", method, err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return zero, fmt.Errorf("telegram read %s: %w", method, err)
	}

	var envelope apiResponse[T]
	if err := json.Unmarshal(responseBody, &envelope); err != nil {
		return zero, fmt.Errorf("telegram decode %s: %w", method, err)
	}
	if !envelope.OK {
		return zero, &APIError{Code: envelope.ErrorCode, Description: envelope.Description}
	}
	return envelope.Result, nil
}

type LabeledPrice struct {
	Label  string `json:"label"`
	Amount int64  `json:"amount"`
}

func (c *Client) RefundStarPayment(ctx context.Context, userID int64, chargeID string) error {
	if userID <= 0 || chargeID == "" {
		return errors.New("invalid refund")
	}
	_, err := call[bool](ctx, c, "refundStarPayment", map[string]any{"user_id": userID, "telegram_payment_charge_id": chargeID})
	var apiErr *APIError
	if errors.As(err, &apiErr) && strings.Contains(strings.ToUpper(apiErr.Description), "CHARGE_ALREADY_REFUNDED") {
		return nil
	}
	return err
}

type createInvoiceLinkRequest struct {
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	Payload       string         `json:"payload"`
	Currency      string         `json:"currency"`
	Prices        []LabeledPrice `json:"prices"`
	ProviderToken string         `json:"provider_token"`
}

func (c *Client) CreateInvoiceLink(ctx context.Context, title, description, payload, currency string, amount int64) (string, error) {
	return call[string](ctx, c, "createInvoiceLink", createInvoiceLinkRequest{
		Title: title, Description: description, Payload: payload, Currency: currency,
		Prices: []LabeledPrice{{Label: title, Amount: amount}}, ProviderToken: "",
	})
}

type User struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Username  string `json:"username"`
}

type PreCheckoutQuery struct {
	ID             string `json:"id"`
	From           User   `json:"from"`
	Currency       string `json:"currency"`
	TotalAmount    int64  `json:"total_amount"`
	InvoicePayload string `json:"invoice_payload"`
}

type SuccessfulPayment struct {
	Currency                string `json:"currency"`
	TotalAmount             int64  `json:"total_amount"`
	InvoicePayload          string `json:"invoice_payload"`
	TelegramPaymentChargeID string `json:"telegram_payment_charge_id"`
	ProviderPaymentChargeID string `json:"provider_payment_charge_id"`
}

type Message struct {
	MessageID         int64              `json:"message_id"`
	From              *User              `json:"from"`
	Chat              Chat               `json:"chat"`
	SuccessfulPayment *SuccessfulPayment `json:"successful_payment"`
	Contact           *Contact           `json:"contact"`
	Text              string             `json:"text"`
	ForwardOrigin     json.RawMessage    `json:"forward_origin"`
}

type Contact struct {
	PhoneNumber string `json:"phone_number"`
	UserID      int64  `json:"user_id"`
}

type Chat struct {
	ID   int64  `json:"id"`
	Type string `json:"type"`
}

type Update struct {
	CallbackQuery    *CallbackQuery    `json:"callback_query"`
	UpdateID         int64             `json:"update_id"`
	PreCheckoutQuery *PreCheckoutQuery `json:"pre_checkout_query"`
	Message          *Message          `json:"message"`
}

func (c *Client) GetUpdates(ctx context.Context, offset int64, timeout int) ([]Update, error) {
	return call[[]Update](ctx, c, "getUpdates", map[string]any{
		"offset":          offset,
		"timeout":         timeout,
		"allowed_updates": []string{"pre_checkout_query", "message", "callback_query"},
	})
}

func (c *Client) AnswerPreCheckoutQuery(ctx context.Context, id string, approved bool, errorMessage string) error {
	input := map[string]any{"pre_checkout_query_id": id, "ok": approved}
	if !approved {
		if strings.TrimSpace(errorMessage) == "" {
			errorMessage = "این پرداخت دیگر قابل انجام نیست."
		}
		input["error_message"] = errorMessage
	}
	_, err := call[bool](ctx, c, "answerPreCheckoutQuery", input)
	return err
}

func (c *Client) DeleteWebhook(ctx context.Context, dropPending bool) error {
	_, err := call[bool](ctx, c, "deleteWebhook", map[string]any{"drop_pending_updates": dropPending})
	return err
}

func (c *Client) SetWebhook(ctx context.Context, url, secret string) error {
	input := map[string]any{
		"url":             url,
		"allowed_updates": []string{"pre_checkout_query", "message", "callback_query"},
	}
	if secret != "" {
		input["secret_token"] = secret
	}
	_, err := call[bool](ctx, c, "setWebhook", input)
	return err
}

func (c *Client) SendMessage(ctx context.Context, chatID int64, text string) error {
	if chatID == 0 {
		return errors.New("telegram chat id is required")
	}
	_, err := call[Message](ctx, c, "sendMessage", map[string]any{"chat_id": chatID, "text": text})
	return err
}

func (c *Client) RequestContact(ctx context.Context, chatID int64) error {
	_, err := call[Message](ctx, c, "sendMessage", map[string]any{
		"chat_id": chatID, "text": "برای تأیید شماره حساب تلگرام خود، دکمه زیر را بزنید. شماره فقط برای حساب خود شما ثبت می‌شود.",
		"reply_markup": map[string]any{"keyboard": [][]map[string]any{{{"text": "اشتراک‌گذاری شماره من", "request_contact": true}}}, "resize_keyboard": true, "one_time_keyboard": true},
	})
	return err
}

func (c *Client) BotUsername(ctx context.Context) (string, error) {
	user, err := call[User](ctx, c, "getMe", map[string]any{})
	return user.Username, err
}

func (c *Client) SendMiniAppWelcome(ctx context.Context, chatID int64) error {
	// Reuse the configured menu URL (including its tunnel) rather than assuming
	// that a separate Main Mini App has been configured in BotFather.
	type menuButton struct {
		Type   string `json:"type"`
		WebApp struct {
			URL string `json:"url"`
		} `json:"web_app"`
	}
	menu, lookupErr := call[menuButton](ctx, c, "getChatMenuButton", map[string]any{"chat_id": chatID})
	if lookupErr == nil && menu.Type == "default" {
		menu, lookupErr = call[menuButton](ctx, c, "getChatMenuButton", map[string]any{})
	}
	input := map[string]any{"chat_id": chatID, "text": "به فروشگاه خوش آمدید. مینی‌اپ را از منوی ربات باز کنید."}
	if lookupErr == nil && menu.Type == "web_app" && strings.HasPrefix(menu.WebApp.URL, "https://") {
		input["text"] = "به فروشگاه خوش آمدید. برای ورود، دکمه زیر را بزنید."
		input["reply_markup"] = map[string]any{"inline_keyboard": [][]map[string]any{{{"text": "ورود به فروشگاه", "web_app": map[string]string{"url": menu.WebApp.URL}}}}}
	}
	_, err := call[Message](ctx, c, "sendMessage", input)
	return err
}
