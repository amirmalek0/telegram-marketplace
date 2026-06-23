import apiClient from './client';
import { LoginRequest, LoginResponse, RefreshRequest } from '@/types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  refresh: (data: RefreshRequest) =>
    apiClient.post<LoginResponse>('/auth/refresh', data).then((r) => r.data),
};
