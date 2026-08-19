export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export type RefreshResponse = LoginResponse;
export type MeResponse = User;

export interface LoginRequest {
  email: string;
  password: string;
}
