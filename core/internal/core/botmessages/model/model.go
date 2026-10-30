package model

import "errors"

var ErrInvalid = errors.New("تنظیمات پیام یا دکمه معتبر نیست")
var ErrConflict = errors.New("تنظیمات توسط مدیر دیگری تغییر کرده؛ صفحه را دوباره دریافت کنید")

type Button struct {
	Text   string `json:"text"`
	Action string `json:"action"`
	Value  string `json:"value"`
	Style  string `json:"style"`
}
type Template struct {
	Key          string     `json:"key"`
	Name         string     `json:"name"`
	Text         string     `json:"text"`
	Format       string     `json:"format"`
	Enabled      bool       `json:"enabled"`
	Rows         [][]Button `json:"rows"`
	ContactLabel string     `json:"contact_label"`
	ContactStyle string     `json:"contact_style"`
}
type Config struct {
	Revision int64      `json:"revision"`
	Messages []Template `json:"messages"`
}
type Definition struct {
	Key       string   `json:"key"`
	Name      string   `json:"name"`
	Group     string   `json:"group"`
	Kind      string   `json:"kind"`
	Limit     int      `json:"limit"`
	Variables []string `json:"variables"`
	Default   Template `json:"default"`
}
type View struct {
	Config
	Definitions []Definition `json:"definitions"`
}
