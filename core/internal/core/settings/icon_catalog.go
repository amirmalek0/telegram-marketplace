package settings

import (
	_ "embed"
	"strings"
)

//go:embed icon_catalog.txt
var iconCatalogSource string

var catalogIcons = func() map[string]bool {
	icons := make(map[string]bool)
	for _, name := range strings.Fields(iconCatalogSource) {
		icons[name] = true
	}
	return icons
}()

func validNavigationIcon(icon string) bool {
	return catalogIcons[icon] || widgetContains([]string{"shop", "wallet", "crown", "tickets", "profile", "orders", "download", "bell", "star", "gift", "box", "file", "search", "sparkles", "phone", "info", "eye", "clock", "check", "sun", "moon"}, icon)
}
