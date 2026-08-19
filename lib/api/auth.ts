import { request } from '../api';
import type { LoginRequest, LoginResponse, MeResponse, RefreshResponse } from '../../types/auth';

export const authApi = {
  login: (payload: LoginRequest) => request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  refresh: (refreshToken: string) => request<RefreshResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false),
  logout: (refreshToken: string) => request<null>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false),
  me: () => request<MeResponse>('/auth/me'),
};
