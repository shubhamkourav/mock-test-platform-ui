const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

type ApiResponse<T> = { success: boolean; message: string; data: T };

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

async function request<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
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
        const refreshed = await request<{ accessToken: string; refreshToken: string; user?: User }>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false);
        storeSession(refreshed);
        return request<T>(path, options, false);
      } catch {
        clearSession();
      }
    }
  }
  if (!response.ok) throw new Error(body.message ?? 'Request failed');
  return (body as ApiResponse<T>).data;
}

export type User = { id: string; name: string; email: string; role: 'student' | 'admin' };
export const api = request;

export const apiClient = {
  login: (payload: { email: string; password: string }) => request<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  refresh: (refreshToken: string) => request<{ accessToken: string; refreshToken: string; user: User }>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false),
  logout: (refreshToken: string) => request<null>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false),
  me: () => request<User>('/auth/me'),
  exams: () => request<any[]>('/exams'),
  tests: (examId?: string) => request<any[]>(`/tests${examId ? `?examId=${encodeURIComponent(examId)}` : ''}`),
  test: (id: string) => request<any>(`/tests/${id}`),
  startAttempt: (testId: string) => request<any>('/attempts', { method: 'POST', body: JSON.stringify({ testId }) }),
  attempt: (id: string) => request<any>(`/attempts/${id}`),
  saveAnswer: (id: string, payload: { questionId: string; selectedOptions: string[]; markedForReview: boolean; timeSpentSeconds: number }) => request<any>(`/attempts/${id}/answers`, { method: 'POST', body: JSON.stringify(payload) }),
  submitAttempt: (id: string) => request<any>(`/attempts/${id}/submit`, { method: 'POST', body: JSON.stringify({}) }),
  result: (id: string) => request<any>(`/attempts/${id}/result`),
};
