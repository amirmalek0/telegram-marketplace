package settings

import (
	"fmt"
	"testing"
)

func TestProductFactIcons(t *testing.T) {
	for _, icons := range []string{`{}`, `{"category":"box","delivery":"lucide:star","views":"eye","access":"crown","repurchasable":"orders","published":"clock","demo":"lucide:arrow-up-left"}`} {
		layout := fmt.Sprintf(`{"version":1,"sections":[{"type":"product.checkout","visible":true,"design":"original"},{"type":"product.facts","visible":true,"design":"glass","facts":{"views":false},"factIcons":%s}]}`, icons)
		if err := validatePageLayout("appearance.page.product", layout); err != nil {
			t.Fatalf("valid icons rejected: %v", err)
		}
	}
	for _, icons := range []string{"null", "[]", "true", `{"views":false}`, `{"views":null}`, `{"unknown":"eye"}`, `{"views":"lucide:not-an-icon"}`, `{"views":"<svg/>"}`} {
		layout := fmt.Sprintf(`{"version":1,"sections":[{"type":"product.checkout","visible":true,"design":"original"},{"type":"product.facts","visible":true,"design":"original","factIcons":%s}]}`, icons)
		if validatePageLayout("appearance.page.product", layout) == nil {
			t.Fatalf("accepted invalid icons: %s", icons)
		}
	}
	if validatePageLayout("appearance.page.shop", `{"version":1,"sections":[{"type":"catalog.products","visible":true,"design":"list","factIcons":{"views":"eye"}}]}`) == nil {
		t.Fatal("accepted product icons on another widget")
	}
}

func TestProductFactVisibility(t *testing.T) {
	for _, fields := range []string{
		"{}", `{"category":true,"delivery":false,"views":false,"access":true,"repurchasable":false,"published":false,"demo":true}`,
	} {
		layout := fmt.Sprintf(`{"version":1,"sections":[{"type":"product.checkout","visible":true,"design":"original"},{"type":"product.facts","visible":true,"design":"glass","facts":%s}]}`, fields)
		if err := validatePageLayout("appearance.page.product", layout); err != nil {
			t.Fatalf("valid visibility rejected: %v", err)
		}
	}
	for _, fields := range []string{"null", "[]", `{"views":"false"}`, `{"views":null}`, `{"file_id":false}`} {
		layout := fmt.Sprintf(`{"version":1,"sections":[{"type":"product.checkout","visible":true,"design":"original"},{"type":"product.facts","visible":true,"design":"original","facts":%s}]}`, fields)
		if validatePageLayout("appearance.page.product", layout) == nil {
			t.Fatalf("accepted invalid visibility: %s", fields)
		}
	}
	if validatePageLayout("appearance.page.shop", `{"version":1,"sections":[{"type":"catalog.products","visible":true,"design":"list","facts":{"views":false}}]}`) == nil {
		t.Fatal("accepted product facts on another widget")
	}
}
