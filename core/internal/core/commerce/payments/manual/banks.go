package manual

import "strings"

// Prefix data: @persian-tools/persian-tools 4.0.4 (MIT; see THIRD_PARTY_LICENSE).
// This identifies the issuing prefix, not current account ownership or validity.
var banks = []struct {
	Bank
	Prefixes string
}{
	{Bank{"Melli", "بانک ملی ایران"}, "603799 170019"},
	{Bank{"Mellat", "بانک ملت"}, "610433 991975"},
	{Bank{"Saderat", "بانک صادرات ایران"}, "603769 903769"},
	{Bank{"Tejarat", "بانک تجارت"}, "627353 585983"},
	{Bank{"Sepah", "بانک سپه"}, "589210"},
	{Bank{"SepahMergedAnsar", "بانک انصار"}, "627381"},
	{Bank{"SepahMergedHekmat", "بانک حکمت ایرانیان"}, "636949"},
	{Bank{"SepahMergedGhavamin", "بانک قوامین"}, "639599"},
	{Bank{"SepahMergedKosar", "مؤسسه کوثر"}, "505801"},
	{Bank{"Saman", "بانک سامان"}, "621986"},
	{Bank{"Pasargad", "بانک پاسارگاد"}, "502229 639347"},
	{Bank{"Parsian", "بانک پارسیان"}, "622106 627884 639194"},
	{Bank{"Keshavarzi", "بانک کشاورزی"}, "603770 639217"},
	{Bank{"Maskan", "بانک مسکن"}, "628023"},
	{Bank{"Refah", "بانک رفاه کارگران"}, "589463"},
	{Bank{"EghtesadNovin", "بانک اقتصاد نوین"}, "627412"},
	{Bank{"Karafarin", "بانک کارآفرین"}, "627488 502910"},
	{Bank{"Sina", "بانک سینا"}, "639346"},
	{Bank{"Sarmayeh", "بانک سرمایه"}, "639607"},
	{Bank{"Shahr", "بانک شهر"}, "502806 504706"},
	{Bank{"Dey", "بانک دی"}, "502938"},
	{Bank{"Ayandeh", "بانک آینده"}, "636214"},
	{Bank{"IranZamin", "بانک ایران زمین"}, "505785"},
	{Bank{"Gardeshgari", "بانک گردشگری"}, "505416 505426"},
	{Bank{"KhavarMianeh", "بانک خاورمیانه"}, "585947"},
	{Bank{"Resalat", "بانک رسالت"}, "504172"},
	{Bank{"MehrIran", "بانک مهر ایران"}, "606373 639370"},
	{Bank{"Post", "پست بانک ایران"}, "627760"},
	{Bank{"SanatMadan", "بانک صنعت و معدن"}, "627961"},
	{Bank{"ToseeSaderat", "بانک توسعه صادرات"}, "627648 207177"},
	{Bank{"ToseeTaavon", "بانک توسعه تعاون"}, "502908"},
	{Bank{"Melall", "مؤسسه اعتباری ملل"}, "606256"},
	{Bank{"Noor", "مؤسسه نور"}, "507677"},
	{Bank{"Tosee", "مؤسسه اعتباری توسعه"}, "628157"},
	{Bank{"BankMarkazi", "بانک مرکزی ایران"}, "636795 636797"},
}

func DetectCard(raw string) (string, Bank, error) {
	number := strings.NewReplacer(" ", "", "-", "").Replace(NormalizeDigits(strings.TrimSpace(raw)))
	if len(number) != 16 {
		return "", Bank{}, ErrInvalid
	}
	sum := 0
	for i, c := range number {
		if c < '0' || c > '9' {
			return "", Bank{}, ErrInvalid
		}
		d := int(c - '0')
		if i%2 == 0 {
			d *= 2
			if d > 9 {
				d -= 9
			}
		}
		sum += d
	}
	if sum%10 != 0 {
		return "", Bank{}, ErrInvalid
	}
	for _, bank := range banks {
		for _, prefix := range strings.Fields(bank.Prefixes) {
			if strings.HasPrefix(number, prefix) {
				return number, bank.Bank, nil
			}
		}
	}
	return "", Bank{}, ErrInvalid
}
