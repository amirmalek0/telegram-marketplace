package settings

import "context"

func (s *Service) PhoneVerificationRequired(ctx context.Context) (bool, error) {
	return s.repo.PhoneVerificationRequired(ctx)
}

func (s *Service) UpdateGeneral(ctx context.Context, required bool) (*GeneralResponse, error) {
	if err := s.repo.SetPhoneVerificationRequired(ctx, required); err != nil {
		return nil, err
	}
	return &GeneralResponse{RequirePhoneVerification: required}, nil
}
