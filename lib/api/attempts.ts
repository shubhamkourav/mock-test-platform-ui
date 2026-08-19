import { request } from '../api';
import type {
  AttemptResponse,
  AttemptResult,
  SaveAnswerInput,
  SaveAnswerResponse,
  StartAttemptResponse,
  SubmitAttemptResponse,
} from '../../types/attempt';

export const attemptsApi = {
  start: (testId: string) => request<StartAttemptResponse>('/attempts', { method: 'POST', body: JSON.stringify({ testId }) }),
  get: (id: string) => request<AttemptResponse>(`/attempts/${id}`),
  saveAnswer: (id: string, payload: SaveAnswerInput) => request<SaveAnswerResponse>(`/attempts/${id}/answers`, { method: 'POST', body: JSON.stringify(payload) }),
  submit: (id: string) => request<SubmitAttemptResponse>(`/attempts/${id}/submit`, { method: 'POST', body: JSON.stringify({}) }),
  result: (id: string) => request<AttemptResult>(`/attempts/${id}/result`),
};
