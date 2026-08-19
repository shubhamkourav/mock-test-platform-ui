import { request } from '../api';
import type {
  AdminQuestion,
  CreateQuestionInput,
  QuestionFilters,
  QuestionListResponse,
  StudentQuestion,
  UpdateQuestionInput,
} from '../../types/question';

function toQuery(filters: QuestionFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const questionsApi = {
  list: (filters?: QuestionFilters) => request<QuestionListResponse>(`/questions${toQuery(filters)}`),
  get: (id: string) => request<StudentQuestion | AdminQuestion>(`/questions/${id}`),
  create: (payload: CreateQuestionInput) => request<AdminQuestion>('/questions', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: UpdateQuestionInput) => request<AdminQuestion>(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deactivate: (id: string) => request<AdminQuestion>(`/questions/${id}`, { method: 'DELETE' }),
};
