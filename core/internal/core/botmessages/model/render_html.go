package model

import (
	"encoding/xml"
	"html"
	"io"
	"strings"
)

// Limit visible UTF-16 units, not markup/entity bytes, and always close open tags.
func boundedHTML(text string, limit int) (string, error) {
	decoder := xml.NewDecoder(strings.NewReader("<root>" + text + "</root>"))
	var output strings.Builder
	written := []bool{}
	for {
		value, err := decoder.Token()
		if err == io.EOF {
			return output.String(), nil
		}
		if err != nil {
			return "", ErrInvalid
		}
		switch token := value.(type) {
		case xml.StartElement:
			include := len(written) > 0 && limit > 0
			written = append(written, include)
			if include {
				output.WriteString("<" + token.Name.Local)
				for _, attribute := range token.Attr {
					output.WriteString(" " + attribute.Name.Local + "=\"" + html.EscapeString(attribute.Value) + "\"")
				}
				output.WriteString(">")
			}
		case xml.EndElement:
			if len(written) == 0 {
				return "", ErrInvalid
			}
			last := written[len(written)-1]
			written = written[:len(written)-1]
			if last {
				output.WriteString("</" + token.Name.Local + ">")
			}
		case xml.CharData:
			chunk := Truncate(string(token), limit)
			limit -= Units(chunk)
			output.WriteString(html.EscapeString(chunk))
		default:
			return "", ErrInvalid
		}
	}
}
