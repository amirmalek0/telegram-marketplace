package model

type ReviewNotification struct {
	TemplateKey             string
	Vars                    map[string]string
	ID, Message, LeaseToken string
	ChatID                  int64
	Attempts                int
}
