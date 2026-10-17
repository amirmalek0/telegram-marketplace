package model

import "time"

type Settings struct {
	Enabled        bool   `json:"enabled"`
	InviterStars   int64  `json:"inviter_stars"`
	InviteeStars   int64  `json:"invitee_stars"`
	RewardTrigger  string `json:"reward_trigger"`
	InviterMessage string `json:"inviter_message,omitempty"`
	InviteeMessage string `json:"invitee_message,omitempty"`
}

type Invitation struct {
	RewardTrigger string     `json:"reward_trigger"`
	InviteeStars  int64      `json:"invitee_stars"`
	RewardedAt    *time.Time `json:"rewarded_at"`
}

type Summary struct {
	Settings
	Link        string      `json:"link"`
	Total       int64       `json:"total"`
	Rewarded    int64       `json:"rewarded"`
	EarnedStars int64       `json:"earned_stars"`
	Invitation  *Invitation `json:"invitation"`
}

func ValidSettings(s Settings) bool {
	return s.InviterStars >= 0 && s.InviterStars <= 1000000 && s.InviteeStars >= 0 && s.InviteeStars <= 1000000 &&
		(s.RewardTrigger == "bot_open" || s.RewardTrigger == "phone_verified" || s.RewardTrigger == "first_purchase") &&
		(s.InviterMessage == "" || ValidMessage(s.InviterMessage, "inviter")) &&
		(s.InviteeMessage == "" || ValidMessage(s.InviteeMessage, "invitee"))
}
