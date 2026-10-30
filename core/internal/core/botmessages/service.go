package botmessages

import (
	"context"
	"fmt"
	"html"
	"net/url"
	"strconv"
	"strings"
	"telegram-marketplace/internal/core/botmessages/model"
	"telegram-marketplace/internal/core/botmessages/repository"
	"telegram-marketplace/internal/platform/telegram"
)

type Sender interface {
	SendFormattedMessage(context.Context, int64, string, string, any) error
	MiniAppURL(context.Context, int64) (string, error)
}
type Service struct {
	repo   repository.Repository
	sender Sender
}

func NewService(repo repository.Repository, sender Sender) *Service {
	return &Service{repo: repo, sender: sender}
}
func (s *Service) Load(ctx context.Context) (model.View, error) {
	c := model.Defaults()
	if s.repo != nil {
		saved, legacy, err := s.repo.Load(ctx)
		if err != nil {
			return model.View{}, err
		}
		c.Revision = saved.Revision
		for i := range c.Messages {
			if text := legacy[c.Messages[i].Key]; strings.TrimSpace(text) != "" {
				c.Messages[i].Text = text
			}
		}
		for _, t := range saved.Messages {
			found := false
			for i := range c.Messages {
				if c.Messages[i].Key == t.Key {
					c.Messages[i] = t
					found = true
					break
				}
			}
			if !found && model.IsCustom(t.Key) {
				c.Messages = append(c.Messages, t)
			}
		}
	}
	return model.View{Config: c, Definitions: model.Definitions()}, nil
}
func (s *Service) Save(ctx context.Context, c model.Config, admin string) (model.View, error) {
	if err := model.Validate(c); err != nil {
		return model.View{}, err
	}
	saved, err := s.repo.Save(ctx, c, admin)
	return model.View{Config: saved, Definitions: model.Definitions()}, err
}
func Identity(user *telegram.User) map[string]string {
	if user == nil {
		return map[string]string{}
	}
	name := strings.TrimSpace(user.FirstName + " " + user.LastName)
	if name == "" {
		name = user.Username
	}
	if name == "" {
		name = "کاربر فروشگاه"
	}
	return map[string]string{"first_name": user.FirstName, "last_name": user.LastName, "user_name": name, "username": user.Username, "telegram_id": strconv.FormatInt(user.ID, 10)}
}
func findTemplate(c model.Config, key string) (model.Template, bool) {
	for _, t := range c.Messages {
		if t.Key == key {
			return t, true
		}
	}
	return model.Template{}, false
}

// Config failures must not prevent answering a payment query or creating an invoice.
func (s *Service) Text(ctx context.Context, key string, vars map[string]string) string {
	d, ok := model.Find(key)
	if !ok {
		return ""
	}
	t := d.Default
	if c, err := s.Load(ctx); err == nil {
		if saved, found := findTemplate(c.Config, key); found {
			t = saved
		}
	}
	text, err := model.Render(t, vars, d.Limit)
	if err != nil || strings.TrimSpace(text) == "" {
		text, _ = model.Render(d.Default, vars, d.Limit)
	}
	return text
}
func (s *Service) Send(ctx context.Context, chat int64, key string, vars map[string]string) error {
	return s.SendNotification(ctx, chat, key, "", vars)
}
func (s *Service) SendMessage(ctx context.Context, chat int64, text string) error {
	return s.sender.SendFormattedMessage(ctx, chat, text, "plain", nil)
}
func (s *Service) SendNotification(ctx context.Context, chat int64, key, fallback string, vars map[string]string) error {
	// Older queued entries only have a rendered snapshot. Preserve that text.
	if fallback != "" && len(vars) == 0 {
		return s.SendMessage(ctx, chat, fallback)
	}
	c, err := s.Load(ctx)
	if err != nil {
		return err
	}
	t, ok := findTemplate(c.Config, key)
	if !ok || !t.Enabled {
		return nil
	}
	d, builtin := model.Find(key)
	if !builtin {
		d.Kind = "message"
		d.Limit = 4096
	}
	if d.Kind == "invoice" || d.Kind == "alert" {
		return model.ErrInvalid
	}
	limit := d.Limit
	if strings.HasPrefix(key, "manual.") {
		limit = 3000
	}
	text, err := model.Render(t, vars, limit)
	if err != nil {
		return err
	}
	if strings.HasPrefix(key, "manual.") {
		extra := []string{}
		// Status/test warnings cannot be removed or replaced with misleading placeholder values.
		for _, field := range []string{"status", "test_notice"} {
			if vars[field] != "" {
				extra = append(extra, vars[field])
			}
		}
		if key == "manual.rejected" && vars["reason"] != "" && !strings.Contains(t.Text, "{reason}") {
			extra = append(extra, "دلیل بررسی: "+model.Truncate(vars["reason"], 500))
		}
		suffix := strings.Join(extra, "\n")
		if t.Format == "HTML" {
			suffix = html.EscapeString(suffix)
		}
		if suffix != "" {
			text += "\n" + suffix
		}
	}
	var markup any
	if d.Kind == "contact" {
		button := map[string]any{"text": t.ContactLabel, "request_contact": true}
		if t.ContactStyle != "" {
			button["style"] = t.ContactStyle
		}
		markup = map[string]any{"keyboard": [][]map[string]any{{button}}, "resize_keyboard": true, "one_time_keyboard": true}
	} else {
		rows := [][]map[string]any{}
		base := ""
		lookedUp := false
		for _, row := range t.Rows {
			buttons := []map[string]any{}
			for _, b := range row {
				button := map[string]any{"text": b.Text}
				if b.Style != "" {
					button["style"] = b.Style
				}
				switch b.Action {
				case "url":
					button["url"] = b.Value
				case "copy":
					button["copy_text"] = map[string]string{"text": b.Value}
				case "message":
					button["callback_data"] = "bm:" + b.Value
				case "verify":
					button["callback_data"] = "bm:verify"
				case "miniapp":
					if !lookedUp {
						base, err = s.sender.MiniAppURL(ctx, chat)
						lookedUp = true
						if err != nil {
							return err
						}
					}
					if base == "" {
						continue
					}
					path := b.Value
					if path == "{action_path}" {
						path = vars["action_path"]
					}
					if !model.ValidPath(path) {
						continue
					}
					u, parseErr := url.Parse(base)
					if parseErr != nil || u.Scheme != "https" || u.Host == "" {
						continue
					}
					if path == "/" {
						button["web_app"] = map[string]string{"url": base}
						break
					}
					dest, _ := url.Parse(path)
					u.Path = dest.Path
					u.RawPath = dest.RawPath
					u.RawQuery = dest.RawQuery
					u.Fragment = ""
					button["web_app"] = map[string]string{"url": u.String()}
				default:
					return fmt.Errorf("unsupported bot button")
				}
				buttons = append(buttons, button)
			}
			if len(buttons) > 0 {
				rows = append(rows, buttons)
			}
		}
		if len(rows) > 0 {
			markup = map[string]any{"inline_keyboard": rows}
		}
	}
	return s.sender.SendFormattedMessage(ctx, chat, text, t.Format, markup)
}
