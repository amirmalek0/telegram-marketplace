package handler

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"telegram-marketplace/internal/app/config"
	"telegram-marketplace/internal/app/router"
	"telegram-marketplace/internal/core/commerce/payments"
	"telegram-marketplace/internal/core/membership/users"
	telegramclient "telegram-marketplace/internal/platform/telegram"
)

const webhookPath = "/telegram/webhook"

// Handler manages Telegram updates needed by the payment lifecycle.
type Handler struct {
	telegram      *telegramclient.Client
	services      router.Handlers
	webhookSecret string
}

func New(cfg config.Config, services router.Handlers) *Handler {
	return &Handler{
		telegram:      telegramclient.NewClient(cfg.BotToken),
		services:      services,
		webhookSecret: cfg.WebhookSecret,
	}
}

// StartPolling consumes Telegram payment updates without advancing the offset
// until an update is processed successfully.
func (h *Handler) StartPolling() error {
	ctx := context.Background()
	if err := h.telegram.DeleteWebhook(ctx, false); err != nil {
		return fmt.Errorf("delete telegram webhook: %w", err)
	}
	var offset int64
	for {
		updates, err := h.telegram.GetUpdates(ctx, offset, 25)
		if err != nil {
			log.Printf("telegram getUpdates: %v", err)
			time.Sleep(2 * time.Second)
			continue
		}
		for _, update := range updates {
			if err := h.processUpdate(ctx, update); err != nil {
				log.Printf("telegram update %d: %v", update.UpdateID, err)
				time.Sleep(2 * time.Second)
				break
			}
			offset = update.UpdateID + 1
		}
	}
}

func (h *Handler) StartWebhook(addr, webhookURL string) error {
	// A forged webhook must never be able to verify phones or settle payments.
	if strings.TrimSpace(h.webhookSecret) == "" {
		return errors.New("TELEGRAM_WEBHOOK_SECRET is required in webhook mode")
	}
	url := strings.TrimRight(webhookURL, "/")
	if !strings.HasSuffix(url, webhookPath) {
		url += webhookPath
	}
	if err := h.telegram.SetWebhook(context.Background(), url, h.webhookSecret); err != nil {
		return fmt.Errorf("set telegram webhook: %w", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc(webhookPath, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if h.webhookSecret != "" {
			received := r.Header.Get("X-Telegram-Bot-Api-Secret-Token")
			if subtle.ConstantTimeCompare([]byte(received), []byte(h.webhookSecret)) != 1 {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
		}
		var update telegramclient.Update
		if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
			http.Error(w, "invalid update", http.StatusBadRequest)
			return
		}
		if err := h.processUpdate(r.Context(), update); err != nil {
			log.Printf("telegram webhook update %d: %v", update.UpdateID, err)
			http.Error(w, "processing failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	return http.ListenAndServe(addr, mux)
}

func (h *Handler) processUpdate(ctx context.Context, update telegramclient.Update) error {
	if message := update.Message; message != nil && message.Contact != nil {
		return h.processContact(ctx, message)
	}
	if message := update.Message; message != nil && message.Text == "/verify" && message.From != nil && message.Chat.Type == "private" && message.Chat.ID == message.From.ID {
		return h.telegram.RequestContact(ctx, message.Chat.ID)
	}
	if h.services.PaymentsService == nil {
		return errors.New("payment service is not configured")
	}
	if query := update.PreCheckoutQuery; query != nil {
		// Also reject already-open invoices if the admin enables the gate.
		if h.services.SettingsService == nil || h.services.UsersService == nil {
			return errors.New("phone verification services are not configured")
		}
		required, err := h.services.SettingsService.PhoneVerificationRequired(ctx)
		if err != nil {
			return err
		}
		if required {
			verified, err := h.services.UsersService.PhoneVerified(ctx, query.From.ID)
			if err != nil {
				return err
			}
			if !verified {
				return h.telegram.AnswerPreCheckoutQuery(ctx, query.ID, false, "ابتدا شماره تلفن خود را در مینی‌اپ تأیید کنید.")
			}
		}
		err = h.services.PaymentsService.ValidatePreCheckout(
			ctx, query.From.ID, query.InvoicePayload, query.Currency, query.TotalAmount,
		)
		if err != nil {
			return h.telegram.AnswerPreCheckoutQuery(ctx, query.ID, false, "این پرداخت معتبر نیست یا منقضی شده است.")
		}
		return h.telegram.AnswerPreCheckoutQuery(ctx, query.ID, true, "")
	}

	if update.Message == nil || update.Message.SuccessfulPayment == nil {
		return nil
	}
	message := update.Message
	paid := message.SuccessfulPayment
	telegramID := message.Chat.ID
	if message.From != nil {
		telegramID = message.From.ID
	}
	raw, _ := json.Marshal(update)
	_, err := h.services.PaymentsService.SettleStarsPayment(ctx, payments.SuccessfulPaymentInput{
		TelegramID:       telegramID,
		ChatID:           message.Chat.ID,
		Currency:         paid.Currency,
		TotalAmount:      paid.TotalAmount,
		InvoicePayload:   paid.InvoicePayload,
		TelegramChargeID: paid.TelegramPaymentChargeID,
		ProviderChargeID: paid.ProviderPaymentChargeID,
		Raw:              raw,
	})
	if err != nil {
		return err
	}
	if err := h.telegram.SendMessage(ctx, message.Chat.ID, "پرداخت شما با موفقیت انجام شد ✅\nحساب شما در مینی‌اپ به‌روزرسانی شده است."); err != nil {
		log.Printf("telegram payment confirmation message: %v", err)
	}
	return nil
}

func (h *Handler) processContact(ctx context.Context, message *telegramclient.Message) error {
	if message.From == nil {
		return nil
	}
	if h.services.UsersService == nil {
		return errors.New("user service is not configured")
	}
	err := h.services.UsersService.VerifyTelegramContact(ctx, users.TelegramContact{
		SenderID: message.From.ID, ContactUserID: message.Contact.UserID, ChatID: message.Chat.ID,
		Private: message.Chat.Type == "private", Forwarded: len(message.ForwardOrigin) > 0 && string(message.ForwardOrigin) != "null",
		PhoneNumber: message.Contact.PhoneNumber, FirstName: message.From.FirstName,
		LastName: message.From.LastName, Username: message.From.Username,
	})
	if errors.Is(err, users.ErrInvalidContact) {
		return nil
	}
	if err != nil {
		return err
	}
	// Do not retry an already-verified contact just because confirmation failed.
	if err := h.telegram.SendMessage(ctx, message.Chat.ID, "شماره تلفن شما تأیید شد ✅\nاکنون می‌توانید به مینی‌اپ برگردید."); err != nil {
		log.Printf("telegram contact confirmation failed")
	}
	return nil
}
