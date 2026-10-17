package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"telegram-marketplace/internal/core/membership/admins/model"
	"telegram-marketplace/internal/core/membership/admins/repository"
	sessionrepo "telegram-marketplace/internal/core/membership/auth/repository"
	"time"
)

var errCredentials = errors.New("invalid credentials")

type Claims struct {
	AdminID           string `json:"admin_id"`
	Purpose           string `json:"purpose"`
	SessionID         string `json:"sid"`
	CredentialVersion string `json:"cv"`
	jwt.RegisteredClaims
}
type Service struct {
	repo                  repository.Repository
	sessions              sessionrepo.Sessions
	jwtSecret             []byte
	accessTTL, refreshTTL time.Duration
}

func NewService(repo repository.Repository, secret string, sessions ...sessionrepo.Sessions) *Service {
	s := &Service{repo: repo, jwtSecret: []byte(secret), accessTTL: 15 * time.Minute, refreshTTL: 7 * 24 * time.Hour}
	if len(sessions) > 0 {
		s.sessions = sessions[0]
	}
	return s
}
func (s *Service) Login(ctx context.Context, username, password string) (*LoginResponse, error) {
	admin, err := s.repo.FindByUsername(ctx, username)
	if err != nil || !admin.IsActive || bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)) != nil {
		return nil, errCredentials
	}
	if s.sessions == nil {
		return nil, errCredentials
	}
	sid, rid := uuid.NewString(), uuid.NewString()
	response, err := s.tokens(admin, sid, rid)
	if err != nil {
		return nil, err
	}
	if err = s.sessions.Create(ctx, sid, admin.ID, rid, time.Now().Add(s.refreshTTL)); err != nil {
		return nil, err
	}
	return response, nil
}
func (s *Service) Refresh(ctx context.Context, token string) (*LoginResponse, error) {
	claims, admin, err := s.validate(ctx, token, "refresh")
	if err != nil {
		return nil, errCredentials
	}
	next := uuid.NewString()
	response, err := s.tokens(admin, claims.SessionID, next)
	if err != nil {
		return nil, err
	}
	ok, err := s.sessions.Rotate(ctx, claims.SessionID, admin.ID, claims.ID, next, time.Now().Add(s.refreshTTL))
	if err != nil || !ok {
		return nil, errCredentials
	}
	return response, nil
}
func (s *Service) ValidateToken(token string) (*Claims, error) {
	return s.ValidateAccessToken(context.Background(), token)
}
func (s *Service) ValidateAccessToken(ctx context.Context, token string) (*Claims, error) {
	claims, _, err := s.validate(ctx, token, "access")
	return claims, err
}
func (s *Service) Logout(ctx context.Context, token string) error {
	claims, _, err := s.validate(ctx, token, "access")
	if err != nil {
		claims, _, err = s.validate(ctx, token, "refresh")
	}
	if err != nil {
		return errCredentials
	}
	return s.sessions.Revoke(ctx, claims.SessionID, claims.AdminID)
}
func (s *Service) validate(ctx context.Context, raw, purpose string) (*Claims, *model.Admin, error) {
	if s.sessions == nil || len(raw) > 8192 {
		return nil, nil, errCredentials
	}
	token, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (interface{}, error) { return s.jwtSecret, nil },
		jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired(), jwt.WithIssuedAt(), jwt.WithIssuer("marketplace-admin"), jwt.WithAudience("backoffice"))
	if err != nil || !token.Valid {
		return nil, nil, errCredentials
	}
	c, ok := token.Claims.(*Claims)
	if !ok || c.Purpose != purpose || c.AdminID == "" || c.SessionID == "" || c.ID == "" {
		return nil, nil, errCredentials
	}
	admin, err := s.repo.FindByID(ctx, c.AdminID)
	if err != nil || !admin.IsActive || !hmac.Equal([]byte(c.CredentialVersion), []byte(s.version(admin))) {
		return nil, nil, errCredentials
	}
	valid, err := s.sessions.Valid(ctx, c.SessionID, c.AdminID)
	if err != nil || !valid {
		return nil, nil, errCredentials
	}
	return c, admin, nil
}
func (s *Service) version(a *model.Admin) string {
	mac := hmac.New(sha256.New, s.jwtSecret)
	mac.Write([]byte(a.ID + "\x00" + a.PasswordHash))
	return hex.EncodeToString(mac.Sum(nil))
}
func (s *Service) tokens(a *model.Admin, sid, rid string) (*LoginResponse, error) {
	access, err := s.generateToken(a, sid, uuid.NewString(), "access", s.accessTTL)
	if err != nil {
		return nil, err
	}
	refresh, err := s.generateToken(a, sid, rid, "refresh", s.refreshTTL)
	if err != nil {
		return nil, err
	}
	return &LoginResponse{AccessToken: access, RefreshToken: refresh, ExpiresIn: int64(s.accessTTL.Seconds())}, nil
}
func (s *Service) generateToken(a *model.Admin, sid, id, purpose string, ttl time.Duration) (string, error) {
	claims := Claims{AdminID: a.ID, Purpose: purpose, SessionID: sid, CredentialVersion: s.version(a), RegisteredClaims: jwt.RegisteredClaims{
		Issuer: "marketplace-admin", Audience: jwt.ClaimStrings{"backoffice"}, ID: id, ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)), IssuedAt: jwt.NewNumericDate(time.Now())}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}
