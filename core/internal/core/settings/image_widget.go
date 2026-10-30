package settings

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

var imagePathPattern = regexp.MustCompile(`^/api/v1/miniapp-images/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$`)
var imageNumberRules = func() map[string][2]float64 {
	rules := map[string][2]float64{"height": {24, 1200}, "mobileHeight": {24, 800}, "marginLeft": {0, 120}, "marginRight": {0, 120}}
	for key, limits := range widgetNumberRules {
		if strings.HasPrefix(key, "padding") || strings.HasPrefix(key, "margin") || strings.HasPrefix(key, "border") || widgetContains([]string{"width", "maxWidth", "opacity"}, key) {
			rules[key] = limits
		}
	}
	return rules
}()
var imageEnumRules = map[string][]string{"objectFit": {"contain", "cover"}, "alignment": {"start", "center", "end"}, "borderStyle": {"solid", "dashed", "dotted", "double"}, "shadow": {"none", "soft", "lifted"}}

func validateImageWidget(section map[string]json.RawMessage, design string) (string, error) {
	invalid := fmt.Errorf("invalid image widget: check image, identifier, style fields or local CSS")
	var id string
	if len(section) != 5 || json.Unmarshal(section["id"], &id) != nil || !widgetIDPattern.MatchString(id) || !widgetContains([]string{"plain", "soft", "outlined", "glass", "accent"}, design) {
		return "", invalid
	}
	var fields map[string]json.RawMessage
	if json.Unmarshal(section["image"], &fields) != nil || len(fields) != 4 {
		return "", invalid
	}
	var src, alt, css string
	for key, dest := range map[string]*string{"src": &src, "alt": &alt, "css": &css} {
		if string(fields[key]) == "null" || json.Unmarshal(fields[key], dest) != nil {
			return "", invalid
		}
	}
	if (src != "" && !imagePathPattern.MatchString(src)) || utf8.RuneCountInString(alt) > 500 || !validWidgetCSS(css) {
		return "", invalid
	}
	var styles map[string]json.RawMessage
	if json.Unmarshal(fields["styles"], &styles) != nil || styles == nil {
		return "", invalid
	}
	for key, raw := range styles {
		if limits, ok := imageNumberRules[key]; ok {
			var n float64
			if string(raw) == "null" || json.Unmarshal(raw, &n) != nil || n < limits[0] || n > limits[1] {
				return "", invalid
			}
			continue
		}
		var value string
		if json.Unmarshal(raw, &value) != nil {
			return "", invalid
		}
		if values, ok := imageEnumRules[key]; ok {
			if !widgetContains(values, value) {
				return "", invalid
			}
		} else if !widgetContains([]string{"backgroundColor", "borderColor"}, key) || !widgetColorPattern.MatchString(value) {
			return "", invalid
		}
	}
	return id, nil
}
