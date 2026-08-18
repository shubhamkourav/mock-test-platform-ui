const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

type ApiResponse<T> = { success: boolean; message: string; data: T };

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? 'Request failed');
  return (body as ApiResponse<T>).data;
}

export { api };

export const apiClient = {
  login: (payload: { email: string; password: string }) =>
    api<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST', body: JSON.stringify(payload),
    }),
  exams: () => api<any[]>('/exams'),
  tests: (examId?: string) => api<any[]>(`/tests${examId ? `?examId=${examId}` : ''}`),
  test: (id: string) => api<any>(`/tests/${id}`),
  startAttempt: (testId: string) => api<any>('/attempts', {
    method: 'POST', body: JSON.stringify({ testId }),
  }),
  attempt: (id: string) => api<any>(`/attempts/${id}`),
  saveAnswer: (id: string, payload: any) => api<any>(`/attempts/${id}/answers`, {
    method: 'POST', body: JSON.stringify(payload),
  }),
  submitAttempt: (id: string, autoSubmitted = false) => api<any>(`/attempts/${id}/submit`, {
    method: 'POST', body: JSON.stringify({ autoSubmitted }),
  }),
  result: (id: string) => api<any>(`/attempts/${id}/result`),
};