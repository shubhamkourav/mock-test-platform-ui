import type { LoginResponse, User } from '../types/auth';
import type { Exam } from '../types/exam';
import type { AttemptResponse, AttemptResult, SaveAnswerInput, SaveAnswerResponse, StartAttemptResponse, SubmitAttemptResponse } from '../types/attempt';
import type { Test, TestDetailResponse } from '../types/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

type ApiResponse<T> = { success: boolean; message: string; data: T };

export interface ApiErrorDetails {
  [key: string]: unknown;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: ApiErrorDetails;

  constructor(status: number, message: string, code?: string, details?: ApiErrorDetails) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getStoredToken(key: 'accessToken' | 'refreshToken') {
  return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
}

function storeSession(session: { accessToken: string; refreshToken: string }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', session.accessToken);
  localStorage.setItem('refreshToken', session.refreshToken);
}

function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function request<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const token = getStoredToken('accessToken');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));

  if (response.status === 401 && allowRefresh && path !== '/auth/refresh') {
    const refreshToken = getStoredToken('refreshToken');
    if (refreshToken) {
      try {
        const refreshed = await request<LoginResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false);
        storeSession(refreshed);
        return request<T>(path, options, false);
      } catch {
        clearSession();
      }
    }
  }

  if (!response.ok) {
    const errorBody = body as { message?: string; code?: string; details?: ApiErrorDetails };
    throw new ApiClientError(response.status, errorBody.message ?? 'Request failed', errorBody.code, errorBody.details);
  }

  return (body as ApiResponse<T>).data;
}

export { clearSession, storeSession };
export type { User };

export const api = request;

/**
 * Backward-compatible facade for existing Phase 1 components.
 * New Phase 2 code should use the domain modules under lib/api/.
 */
export const apiClient = {
  login: (payload: { email: string; password: string }) => request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  refresh: (refreshToken: string) => request<LoginResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false),
  logout: (refreshToken: string) => request<null>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false),
  me: () => request<User>('/auth/me'),
  exams: () => request<Exam[]>('/exams'),
  tests: (examId?: string) => request<Test[]>(`/tests${examId ? `?examId=${encodeURIComponent(examId)}` : ''}`),
  test: (id: string) => request<TestDetailResponse>(`/tests/${id}`),
  startAttempt: (testId: string) => request<StartAttemptResponse>('/attempts', { method: 'POST', body: JSON.stringify({ testId }) }),
  attempt: (id: string) => request<AttemptResponse>(`/attempts/${id}`),
  saveAnswer: (id: string, payload: SaveAnswerInput) => request<SaveAnswerResponse>(`/attempts/${id}/answers`, { method: 'POST', body: JSON.stringify(payload) }),
  submitAttempt: (id: string) => request<SubmitAttemptResponse>(`/attempts/${id}/submit`, { method: 'POST', body: JSON.stringify({}) }),
  result: (id: string) => request<AttemptResult>(`/attempts/${id}/result`),
};
