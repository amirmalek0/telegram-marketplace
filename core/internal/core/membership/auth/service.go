package auth

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"telegram-marketplace/internal/core/membership/admins/repository"
)

// Claims represents the JWT claims embedded in admin tokens.
type Claims struct {
	AdminID string `json:"admin_id"`
	jwt.RegisteredClaims
}

// Service handles authentication business logic.
type Service struct {
	repo       repository.Repository
	jwtSecret  []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

// NewService creates a new auth service.
func NewService(repo repository.Repository, jwtSecret string) *Service {
	return &Service{
		repo:       repo,
		jwtSecret:  []byte(jwtSecret),
		accessTTL:  15 * time.Minute,
		refreshTTL: 7 * 24 * time.Hour,
	}
}

// Login authenticates an admin and returns JWT tokens.
func (s *Service) Login(ctx context.Context, username, password string) (*LoginResponse, error) {
	admin, err := s.repo.FindByUsername(ctx, username)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if !admin.IsActive {
		return nil, errors.New("account is disabled")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	accessToken, err := s.generateToken(admin.ID, s.accessTTL)
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.generateToken(admin.ID, s.refreshTTL)
	if err != nil {
		return nil, err
	}

	_ = s.repo.Update(ctx, admin.ID, map[string]interface{}{"last_login_at": time.Now()})

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.accessTTL.Seconds()),
	}, nil
}

// Refresh generates a new access token from a valid refresh token.
func (s *Service) Refresh(ctx context.Context, refreshToken string) (*LoginResponse, error) {
	claims, err := s.ValidateToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	admin, err := s.repo.FindByID(ctx, claims.AdminID)
	if err != nil {
		return nil, errors.New("admin not found")
	}
	if !admin.IsActive {
		return nil, errors.New("account is disabled")
	}

	accessToken, err := s.generateToken(admin.ID, s.accessTTL)
	if err != nil {
		return nil, err
	}
	newRefreshToken, err := s.generateToken(admin.ID, s.refreshTTL)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    int64(s.accessTTL.Seconds()),
	}, nil
}

// ValidateToken parses and validates a JWT token string.
func (s *Service) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func (s *Service) generateToken(adminID string, ttl time.Duration) (string, error) {
	claims := Claims{
		AdminID: adminID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}
