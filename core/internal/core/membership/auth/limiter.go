package auth

import (
	"sync"
	"time"
)

type attempt struct {
	count int
	until time.Time
}
type attemptLimiter struct {
	mu      sync.Mutex
	entries map[string]attempt
}

func newAttemptLimiter() *attemptLimiter { return &attemptLimiter{entries: make(map[string]attempt)} }
func (l *attemptLimiter) allow(key string, max int) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	a, exists := l.entries[key]
	if exists && now.Before(a.until) {
		if a.count >= max {
			return false
		}
		a.count++
		l.entries[key] = a
		return true
	}
	// Bound memory even if an attacker generates arbitrary usernames.
	if len(l.entries) >= 10000 {
		for k, v := range l.entries {
			if !now.Before(v.until) {
				delete(l.entries, k)
			}
		}
		if len(l.entries) >= 10000 {
			return false
		}
	}
	l.entries[key] = attempt{1, now.Add(15 * time.Minute)}
	return true
}
