package util

import (
	"regexp"
	"strings"
)

// slugNonAlnum matches any character that is not a letter, digit, or space.
var slugNonAlnum = regexp.MustCompile(`[^\p{L}\p{N}\s-]`)

// slugSpaces matches one or more whitespace characters (used to replace with dash).
var slugSpaces = regexp.MustCompile(`\s+`)

// GenerateSlug converts a human-readable title into a URL-safe slug.
// Example: "Hello World!" → "hello-world"
func GenerateSlug(title string) string {
	s := strings.ToLower(title)
	s = slugNonAlnum.ReplaceAllString(s, "")
	s = slugSpaces.ReplaceAllString(strings.TrimSpace(s), "-")
	return s
}
