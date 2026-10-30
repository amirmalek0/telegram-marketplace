package manual

import (
	"strings"
	"testing"
)

func TestBankDetection(t *testing.T) {
	for _, value := range []string{"6219861034529007", "۶۲۱۹-۸۶۱۰-۳۴۵۲-۹۰۰۷", "٦٢١٩ ٨٦١٠ ٣٤٥٢ ٩٠٠٧"} {
		number, bank, err := DetectCard(value)
		if err != nil || number != "6219861034529007" || bank.Key != "Saman" {
			t.Fatalf("bad detection: %v %v", bank, err)
		}
	}
	for _, value := range []string{"6219861034529008", "0000000000000000", "4111111111111111", "621986103452900", "6219861034529007<script>", "۶۲۱۹۸۶۱۰۳۴۵۲۹۰۰a"} {
		if _, _, err := DetectCard(value); err == nil {
			t.Fatalf("accepted invalid card: %s", value)
		}
	}
}

func TestConfigValidation(t *testing.T) {
	c := DefaultConfig()
	c.Enabled = true
	if _, err := ValidateConfig(c); err == nil {
		t.Fatal("enabled without cards")
	}
	c.Cards = []Card{{Number: "6219861034529007", Owner: "صاحب کارت", Active: true, Bank: Bank{Key: "forged"}}}
	valid, err := ValidateConfig(c)
	if err != nil {
		t.Fatal(err)
	}
	if valid.Cards[0].ID == "" || valid.Cards[0].Bank.Key != "Saman" {
		t.Fatal("bank metadata must be server derived")
	}
	valid.Mode = "fixed"
	if _, err = ValidateConfig(valid); err == nil {
		t.Fatal("fixed mode without selected card")
	}
	valid.FixedCardID = valid.Cards[0].ID
	if _, err = ValidateConfig(valid); err != nil {
		t.Fatal(err)
	}
	valid.Cards = append(valid.Cards, valid.Cards[0])
	if _, err = ValidateConfig(valid); err == nil {
		t.Fatal("duplicate cards")
	}
}

func TestTransactionNormalization(t *testing.T) {
	v, err := NormalizeTransactionID(" ۱۲۳-ab ")
	if err != nil || v != "123-AB" {
		t.Fatal(v, err)
	}
	for _, v := range []string{"<svg>", "abc def", strings.Repeat("1", 81)} {
		if _, err := NormalizeTransactionID(v); err == nil {
			t.Fatal("invalid reference accepted")
		}
	}
}
