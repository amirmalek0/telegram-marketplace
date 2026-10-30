package model

import "errors"

var ErrPhoneVerificationDisabled = errors.New("برای پاداش پس از تأیید شماره، ابتدا الزام تأیید شماره تلفن را در تنظیمات عمومی فعال کنید")
