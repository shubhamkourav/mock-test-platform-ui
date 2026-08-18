import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api';

describe('API session refresh', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('refreshes an expired access token and retries the request', async () => {
    localStorage.setItem('accessToken', 'expired'); localStorage.setItem('refreshToken', 'refresh-1');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: 'expired' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { accessToken: 'access-2', refreshToken: 'refresh-2', user: { id: '1', name: 'Student', email: 'student@example.com', role: 'student' } } }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { id: '1', name: 'Student', email: 'student@example.com', role: 'student' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    await expect(apiClient.me()).resolves.toMatchObject({ id: '1', role: 'student' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem('accessToken')).toBe('access-2');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-2');
  });

  it('clears the session when refresh is rejected', async () => {
    localStorage.setItem('accessToken', 'expired'); localStorage.setItem('refreshToken', 'revoked');
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: 'expired' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: 'Invalid refresh token' }), { status: 401 }));
    await expect(apiClient.me()).rejects.toThrow('expired');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
