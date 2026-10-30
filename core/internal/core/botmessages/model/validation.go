package model

import (
	"encoding/xml"
	"fmt"
	"html"
	"io"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf16"
)

var customKey = regexp.MustCompile("^custom\\.[a-z0-9_-]{1,40}$")
var token = regexp.MustCompile("\\{([a-z_]+)\\}")

func IsCustom(key string) bool { return customKey.MatchString(key) }
func StyleValid(s string) bool { return s == "" || s == "primary" || s == "success" || s == "danger" }
func Units(s string) int       { return len(utf16.Encode([]rune(s))) }
func ValidURL(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && (u.Scheme == "https" || u.Scheme == "http" || u.Scheme == "tg") && u.Host != "" && u.User == nil && !strings.ContainsAny(raw, "\r\n\x00{}")
}
func ValidPath(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && strings.HasPrefix(raw, "/") && !strings.HasPrefix(raw, "//") && !strings.ContainsAny(raw, "\\\r\n\x00{}") && u.Host == "" && u.Scheme == "" && u.Fragment == "" && !strings.Contains(raw, "content-editor")
}
func validateHTML(text string) error {
	decoder := xml.NewDecoder(strings.NewReader("<root>" + text + "</root>"))
	first := true
	for {
		tok, err := decoder.Token()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return ErrInvalid
		}
		switch el := tok.(type) {
		case xml.StartElement:
			if first {
				first = false
				continue
			}
			if el.Name.Space != "" {
				return ErrInvalid
			}
			switch el.Name.Local {
			case "b", "strong", "i", "em", "u", "s", "code", "pre", "blockquote", "tg-spoiler":
				if len(el.Attr) != 0 {
					return ErrInvalid
				}
			case "a":
				if len(el.Attr) != 1 || el.Attr[0].Name.Local != "href" || el.Attr[0].Name.Space != "" || !ValidURL(el.Attr[0].Value) {
					return ErrInvalid
				}
			default:
				return ErrInvalid
			}
		case xml.Directive, xml.ProcInst, xml.Comment:
			return ErrInvalid
		}
	}
}
func Validate(c Config) error {
	if c.Revision < 0 || len(c.Messages) > 67 {
		return ErrInvalid
	}
	seen := map[string]bool{}
	for _, t := range c.Messages {
		if t.Rows == nil {
			return ErrInvalid
		}
		if seen[t.Key] {
			return ErrInvalid
		}
		seen[t.Key] = true
		d, builtin := Find(t.Key)
		if !builtin {
			if !IsCustom(t.Key) {
				return ErrInvalid
			}
			d = definition(t.Key, t.Name, "سفارشی", "message", t.Text, 4096, IdentityVariables)
		}
		if strings.TrimSpace(t.Name) == "" || Units(t.Name) > 100 || strings.TrimSpace(t.Text) == "" || Units(t.Text) > d.Limit {
			return fmt.Errorf("%w: %s — متن خالی یا بیش از حد مجاز", ErrInvalid, t.Name)
		}
		if t.Format != "plain" && t.Format != "HTML" {
			return ErrInvalid
		}
		if d.Kind == "alert" || d.Kind == "invoice" {
			if !t.Enabled || t.Format != "plain" || len(t.Rows) > 0 {
				return ErrInvalid
			}
		}
		if d.Kind == "contact" && (!t.Enabled || strings.TrimSpace(t.ContactLabel) == "" || Units(t.ContactLabel) > 64 || !StyleValid(t.ContactStyle) || len(t.Rows) > 0) {
			return ErrInvalid
		}
		if d.Kind != "contact" && (t.ContactLabel != "" || t.ContactStyle != "") {
			return ErrInvalid
		}
		if t.Format == "HTML" {
			if err := validateHTML(t.Text); err != nil {
				return fmt.Errorf("%w: قالب HTML پشتیبانی‌شده نیست", ErrInvalid)
			}
		}
		for _, m := range token.FindAllStringSubmatch(t.Text, -1) {
			valid := false
			for _, v := range d.Variables {
				if v == m[1] {
					valid = true
				}
			}
			if !valid {
				return fmt.Errorf("%w: متغیر %s", ErrInvalid, m[0])
			}
		}
		if len(t.Rows) > 10 {
			return ErrInvalid
		}
		count := 0
		for _, row := range t.Rows {
			if len(row) < 1 || len(row) > 8 {
				return ErrInvalid
			}
			count += len(row)
			for _, b := range row {
				if strings.TrimSpace(b.Text) == "" || Units(b.Text) > 64 || !StyleValid(b.Style) {
					return ErrInvalid
				}
				switch b.Action {
				case "url":
					if !ValidURL(b.Value) || len(b.Value) > 2048 {
						return ErrInvalid
					}
				case "miniapp":
					if b.Value != "{action_path}" && (!ValidPath(b.Value) || len(b.Value) > 500) {
						return ErrInvalid
					}
					if b.Value == "{action_path}" && !strings.HasPrefix(t.Key, "manual.") {
						return ErrInvalid
					}
				case "message":
					if !IsCustom(b.Value) {
						return ErrInvalid
					}
				case "verify":
					if b.Value != "" {
						return ErrInvalid
					}
				case "copy":
					if Units(b.Value) < 1 || Units(b.Value) > 256 {
						return ErrInvalid
					}
				default:
					return ErrInvalid
				}
			}
		}
		if count > 40 {
			return ErrInvalid
		}
	}
	for _, d := range Definitions() {
		if !seen[d.Key] {
			return fmt.Errorf("%w: پیام سیستمی حذف نشده باشد", ErrInvalid)
		}
	}
	for _, t := range c.Messages {
		for _, row := range t.Rows {
			for _, b := range row {
				if b.Action == "message" && !seen[b.Value] {
					return fmt.Errorf("%w: دکمه به پیام حذف‌شده اشاره می‌کند", ErrInvalid)
				}
			}
		}
	}
	return nil
}

// One-pass substitution prevents placeholders in user data becoming executable templates.
func Render(t Template, vars map[string]string, limit int) (string, error) {
	text := token.ReplaceAllStringFunc(t.Text, func(match string) string {
		value := vars[strings.TrimSuffix(strings.TrimPrefix(match, "{"), "}")]
		if t.Format == "HTML" {
			return html.EscapeString(value)
		}
		return value
	})
	if t.Format == "HTML" {
		return boundedHTML(text, limit)
	}
	if Units(text) > limit {
		text = Truncate(text, limit)
	}
	return text, nil
}
func Truncate(s string, limit int) string {
	units := 0
	var result strings.Builder
	for _, r := range s {
		n := 1
		if r > 0xffff {
			n = 2
		}
		if units+n > limit {
			break
		}
		result.WriteRune(r)
		units += n
	}
	return result.String()
}
