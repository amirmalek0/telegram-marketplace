package model

import (
	"strings"
	"testing"
)

func TestDefaultsAndCustomMenus(t *testing.T) {
	c := Defaults()
	if err := Validate(c); err != nil {
		t.Fatal(err)
	}
	custom := Template{Key: "custom.help", Name: "راهنما", Text: "سلام {first_name}", Format: "HTML", Enabled: true, Rows: [][]Button{}}
	c.Messages = append(c.Messages, custom)
	c.Messages[0].Rows = [][]Button{
		{{Text: "راهنما", Action: "message", Value: custom.Key, Style: "primary"}, {Text: "لینک", Action: "url", Value: "https://example.com", Style: "success"}},
		{{Text: "کپی", Action: "copy", Value: "hello", Style: "danger"}, {Text: "شماره", Action: "verify"}},
	}
	if err := Validate(c); err != nil {
		t.Fatal(err)
	}
}
func TestInvalidTemplatesAndButtons(t *testing.T) {
	tests := map[string]func(*Config){
		"missing system":   func(c *Config) { c.Messages = c.Messages[1:] },
		"unknown key":      func(c *Config) { c.Messages[0].Key = "random" },
		"duplicate":        func(c *Config) { c.Messages = append(c.Messages, c.Messages[0]) },
		"unknown variable": func(c *Config) { c.Messages[0].Text = "{secret}" },
		"script":           func(c *Config) { c.Messages[0].Format = "HTML"; c.Messages[0].Text = "<script>x</script>" },
		"root":             func(c *Config) { c.Messages[0].Format = "HTML"; c.Messages[0].Text = "<root>x</root>" },
		"bad html":         func(c *Config) { c.Messages[0].Format = "HTML"; c.Messages[0].Text = "<b>x</i>" },
		"css":              func(c *Config) { c.Messages[0].Format = "HTML"; c.Messages[0].Text = "<b style=\"color:red\">x</b>" },
		"unsafe html link": func(c *Config) {
			c.Messages[0].Format = "HTML"
			c.Messages[0].Text = "<a href=\"javascript:alert(1)\">x</a>"
		},
		"missing contact":  func(c *Config) { c.Messages[1].ContactLabel = "" },
		"contact disabled": func(c *Config) { c.Messages[1].Enabled = false },
		"contact inline":   func(c *Config) { c.Messages[1].Rows = c.Messages[0].Rows },
		"alert buttons":    func(c *Config) { c.Messages[5].Rows = c.Messages[0].Rows },
		"alert long":       func(c *Config) { c.Messages[5].Text = strings.Repeat("😀", 101) },
		"long text":        func(c *Config) { c.Messages[0].Text = strings.Repeat("😀", 2049) },
		"null rows":        func(c *Config) { c.Messages[0].Rows = nil },
	}
	for name, change := range tests {
		t.Run(name, func(t *testing.T) {
			c := Defaults()
			change(&c)
			if Validate(c) == nil {
				t.Fatal("accepted invalid config")
			}
		})
	}
	for _, button := range []Button{
		{Text: "x", Action: "url", Value: "javascript:alert(1)"},
		{Text: "x", Action: "url", Value: "https://user:password@example.com"},
		{Text: "x", Action: "url", Value: "https://example.com/{telegram_id}"},
		{Text: "x", Action: "miniapp", Value: "//evil.test"},
		{Text: "x", Action: "miniapp", Value: "/?content-editor=1"},
		{Text: "x", Action: "message", Value: "manual.approved"},
		{Text: "x", Action: "message", Value: "custom.missing"},
		{Text: "x", Action: "copy", Value: strings.Repeat("x", 257)},
		{Text: "x", Action: "verify", Value: "other-user"},
		{Text: "x", Action: "url", Value: "https://example.com", Style: "#abcdef"},
	} {
		c := Defaults()
		c.Messages[0].Rows = [][]Button{{button}}
		if Validate(c) == nil {
			t.Fatalf("accepted button %+v", button)
		}
	}
	c := Defaults()
	c.Messages[0].Rows = [][]Button{make([]Button, 9)}
	if Validate(c) == nil {
		t.Fatal("accepted nine buttons per row")
	}
}
func TestSafeRenderingAndUnicodeLimits(t *testing.T) {
	long, err := Render(Template{Text: "<b>{user_name}</b>", Format: "HTML"}, map[string]string{"user_name": strings.Repeat("😀", 10)}, 5)
	if err != nil || long != "<b>😀😀</b>" {
		t.Fatal("unbalanced or oversized HTML", long, err)
	}
	entities, err := Render(Template{Text: "<b>{user_name}</b>", Format: "HTML"}, map[string]string{"user_name": "<<<"}, 3)
	if err != nil || entities != "<b>&lt;&lt;&lt;</b>" {
		t.Fatal("entities counted as visible characters", entities, err)
	}
	text, err := Render(Template{Text: "<b>{user_name}</b> {amount}", Format: "HTML"}, map[string]string{"user_name": "A <script> & {amount}", "amount": "10"}, 4096)
	if err != nil || text != "<b>A &lt;script&gt; &amp; {amount}</b> 10" {
		t.Fatal(text, err)
	}
	if Truncate("😀😀x", 3) != "😀" {
		t.Fatal("split unicode")
	}
	for _, path := range []string{"/", "/wallet", "/products/a?view=files"} {
		if !ValidPath(path) {
			t.Fatal(path)
		}
	}
}
