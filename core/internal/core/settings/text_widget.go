package settings

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

var widgetIDPattern = regexp.MustCompile(`^widget-[a-zA-Z0-9-]{8,64}$`)
var widgetColorPattern = regexp.MustCompile(`^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|transparent)$`)
var widgetComments = regexp.MustCompile(`(?s)/\*.*?\*/`)
var widgetUnsafeCSS = regexp.MustCompile(`(?i)url\s*\(|(?:image-set|image|src|expression)\s*\(|(?:https?|data|javascript):|[\\\x00-\x08\x0b\x0c\x0e-\x1f]`)
var widgetAtRule = regexp.MustCompile(`@([a-zA-Z-]*)`)
var widgetNumberRules = map[string][2]float64{
	"fontSize": {10, 120}, "mobileFontSize": {10, 80}, "fontWeight": {100, 900}, "lineHeight": {.8, 3}, "letterSpacing": {-2, 10},
	"paddingTop": {0, 120}, "paddingRight": {0, 120}, "paddingBottom": {0, 120}, "paddingLeft": {0, 120},
	"marginTop": {0, 120}, "marginBottom": {0, 120},
	"borderTopWidth": {0, 16}, "borderRightWidth": {0, 16}, "borderBottomWidth": {0, 16}, "borderLeftWidth": {0, 16},
	"borderTopLeftRadius": {0, 100}, "borderTopRightRadius": {0, 100}, "borderBottomLeftRadius": {0, 100}, "borderBottomRightRadius": {0, 100},
	"width": {20, 100}, "maxWidth": {160, 1600}, "opacity": {0, 1},
}
var widgetEnumRules = map[string][]string{
	"textAlign": {"start", "center", "end", "justify"}, "direction": {"rtl", "ltr"},
	"fontFamily":  {"inherit", "sans-serif", "serif", "monospace"},
	"borderStyle": {"solid", "dashed", "dotted", "double"}, "shadow": {"none", "soft", "lifted"},
	"textDecoration": {"none", "underline", "line-through"},
}

func widgetContains(values []string, value string) bool {
	for _, allowed := range values {
		if allowed == value {
			return true
		}
	}
	return false
}

// The renderer places CSS in a separate shadow root per widget. Validation also
// prevents remote asset fetching and limits the amount of public layout data.
func validWidgetCSS(css string) bool {
	if utf8.RuneCountInString(css) > 4000 {
		return false
	}
	clean := widgetComments.ReplaceAllString(css, "")
	if widgetUnsafeCSS.MatchString(clean) {
		return false
	}
	for _, match := range widgetAtRule.FindAllStringSubmatch(clean, -1) {
		if !widgetContains([]string{"media", "supports", "container", "keyframes", "layer", "starting-style"}, strings.ToLower(match[1])) {
			return false
		}
	}
	return true
}

func validateTextWidget(section map[string]json.RawMessage, kind, design string) (string, error) {
	invalid := fmt.Errorf("invalid text widget: check identifier, tag, content, style fields or local CSS")
	var id string
	if len(section) != 5 || json.Unmarshal(section["id"], &id) != nil || !widgetIDPattern.MatchString(id) ||
		!widgetContains([]string{"plain", "soft", "outlined", "glass", "accent"}, design) {
		return "", invalid
	}
	var text map[string]json.RawMessage
	if json.Unmarshal(section["text"], &text) != nil || len(text) != 4 {
		return "", invalid
	}
	var tag, content, css string
	if json.Unmarshal(text["tag"], &tag) != nil || json.Unmarshal(text["content"], &content) != nil ||
		json.Unmarshal(text["css"], &css) != nil || string(text["content"]) == "null" || string(text["css"]) == "null" ||
		utf8.RuneCountInString(content) > 4000 || !validWidgetCSS(css) {
		return "", invalid
	}
	if (kind == "text.heading" && !widgetContains([]string{"h1", "h2", "h3", "h4", "h5", "h6"}, tag)) || (kind == "text.paragraph" && tag != "p") {
		return "", invalid
	}
	var styles map[string]json.RawMessage
	if json.Unmarshal(text["styles"], &styles) != nil || styles == nil {
		return "", invalid
	}
	for key, raw := range styles {
		if limits, ok := widgetNumberRules[key]; ok {
			var number float64
			if string(raw) == "null" || json.Unmarshal(raw, &number) != nil || number < limits[0] || number > limits[1] {
				return "", invalid
			}
			continue
		}
		var value string
		if json.Unmarshal(raw, &value) != nil {
			return "", invalid
		}
		if values, ok := widgetEnumRules[key]; ok {
			if !widgetContains(values, value) {
				return "", invalid
			}
		} else if !widgetContains([]string{"color", "backgroundColor", "borderColor"}, key) || !widgetColorPattern.MatchString(value) {
			return "", invalid
		}
	}
	return id, nil
}
