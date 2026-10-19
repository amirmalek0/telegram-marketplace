package settings

import (
	"encoding/json"
	"fmt"
	"strings"
)

var layoutPages = map[string]bool{
	"shop": true, "profile": true, "wallet": true, "vip": true, "orders": true, "downloads": true,
	"tickets": true, "notifications": true, "product": true, "category": true, "ticket": true, "new-ticket": true,
}

type sectionRule struct {
	page     string
	required bool
	designs  []string
}

var pageSectionRules = func() map[string]sectionRule {
	result := make(map[string]sectionRule)
	surfaces := []string{"original", "soft", "outlined", "glass", "compact"}
	for _, key := range []string{
		"account.identity", "account.shortcuts", "account.activity", "account.referrals",
		"wallet.balance", "wallet.packs", "wallet.history", "vip.overview", "vip.plans",
		"orders.summary", "orders.list", "downloads.summary", "downloads.list",
		"tickets.intro", "tickets.list", "notifications.feed",
	} {
		result[key] = sectionRule{designs: surfaces}
	}
	result["catalog.categories"] = sectionRule{designs: []string{"ribbon", "grid", "pills", "list", "tiles"}}
	result["catalog.products"] = sectionRule{designs: []string{"list", "grid", "featured", "compact", "carousel"}}
	for _, key := range []string{"product.overview", "product.description", "product.facts", "product.related"} {
		result[key] = sectionRule{page: "product", designs: surfaces}
	}
	for _, key := range []string{"category.overview", "category.products"} {
		result[key] = sectionRule{page: "category", designs: surfaces}
	}
	result["product.checkout"] = sectionRule{page: "product", required: true, designs: []string{"original"}}
	result["ticket.thread"] = sectionRule{page: "ticket", required: true, designs: []string{"original"}}
	result["ticket.form"] = sectionRule{page: "new-ticket", required: true, designs: []string{"original"}}
	return result
}()

// Layouts contain allowlisted presentation metadata, never executable templates.
// Existing auth, phone verification and commerce authorization stay outside them.
func validatePageLayout(key, value string) error {
	page := strings.TrimPrefix(key, "appearance.page.")
	if !layoutPages[page] {
		return fmt.Errorf("unknown miniapp page")
	}
	var document map[string]json.RawMessage
	if err := json.Unmarshal([]byte(value), &document); err != nil || len(document) != 2 {
		return fmt.Errorf("layout must contain version and sections")
	}
	var version int
	var sections []map[string]json.RawMessage
	if json.Unmarshal(document["version"], &version) != nil || version != 1 ||
		json.Unmarshal(document["sections"], &sections) != nil || sections == nil || len(sections) > 24 {
		return fmt.Errorf("invalid layout version or sections")
	}
	seen := make(map[string]bool)
	for _, section := range sections {
		var sectionType, design string
		var visible *bool
		if len(section) != 3 || json.Unmarshal(section["type"], &sectionType) != nil ||
			json.Unmarshal(section["design"], &design) != nil || json.Unmarshal(section["visible"], &visible) != nil || visible == nil {
			return fmt.Errorf("invalid page section")
		}
		rule, exists := pageSectionRules[sectionType]
		if !exists || seen[sectionType] || (rule.page != "" && rule.page != page) || (rule.required && !*visible) {
			return fmt.Errorf("unknown, duplicate or protected page section")
		}
		validDesign := false
		for _, allowed := range rule.designs {
			if design == allowed {
				validDesign = true
				break
			}
		}
		if !validDesign {
			return fmt.Errorf("invalid section design")
		}
		seen[sectionType] = true
	}
	for sectionType, rule := range pageSectionRules {
		if rule.page == page && rule.required && !seen[sectionType] {
			return fmt.Errorf("essential page controls cannot be removed")
		}
	}
	return nil
}
