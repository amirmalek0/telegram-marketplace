package telegram

import (
	"context"
	"errors"
	"strings"
)

func (c *Client) SendFormattedMessage(ctx context.Context, chatID int64, text, format string, markup any) error {
	if chatID == 0 {
		return errors.New("chat id required")
	}
	input := map[string]any{"chat_id": chatID, "text": text}
	if format == "HTML" {
		input["parse_mode"] = "HTML"
	}
	if markup != nil {
		input["reply_markup"] = markup
	}
	_, err := call[Message](ctx, c, "sendMessage", input)
	return err
}
func (c *Client) MiniAppURL(ctx context.Context, chatID int64) (string, error) {
	type menuButton struct {
		Type   string
		WebApp struct{ URL string } `json:"web_app"`
	}
	menu, err := call[menuButton](ctx, c, "getChatMenuButton", map[string]any{"chat_id": chatID})
	if err == nil && menu.Type == "default" {
		menu, err = call[menuButton](ctx, c, "getChatMenuButton", map[string]any{})
	}
	if err != nil {
		return "", err
	}
	if menu.Type != "web_app" || !strings.HasPrefix(menu.WebApp.URL, "https://") {
		return "", nil
	}
	return menu.WebApp.URL, nil
}

type CallbackQuery struct {
	ID      string   `json:"id"`
	From    User     `json:"from"`
	Message *Message `json:"message"`
	Data    string   `json:"data"`
}

func (c *Client) AnswerCallback(ctx context.Context, id string) error {
	_, err := call[bool](ctx, c, "answerCallbackQuery", map[string]any{"callback_query_id": id})
	return err
}
