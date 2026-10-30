package settings

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

var appearanceAtRule = regexp.MustCompile(`(?i)@([a-z-]+)`)

func validateWidgetAppearance(raw json.RawMessage) error {
	var fields map[string]json.RawMessage
	if json.Unmarshal(raw, &fields) != nil || len(fields) != 2 || fields["styles"] == nil || fields["css"] == nil {
		return fmt.Errorf("invalid widget appearance")
	}
	var css string
	if string(fields["css"]) == "null" || json.Unmarshal(fields["css"], &css) != nil {
		return fmt.Errorf("invalid widget CSS")
	}
	for _, match := range appearanceAtRule.FindAllStringSubmatch(widgetComments.ReplaceAllString(css, ""), -1) {
		if !widgetContains([]string{"media", "supports"}, strings.ToLower(match[1])) {
			return fmt.Errorf("widget CSS supports only media and supports rules")
		}
	}
	data, _ := json.Marshal(map[string]any{"tag": "p", "content": "", "styles": fields["styles"], "css": css})
	_, err := validateTextWidget(map[string]json.RawMessage{"id": json.RawMessage(`"widget-appearance"`), "type": json.RawMessage(`"text.paragraph"`), "visible": json.RawMessage(`true`), "design": json.RawMessage(`"plain"`), "text": data}, "text.paragraph", "plain")
	return err
}
