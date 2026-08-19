import { request } from '../api';
import type {
  AddTestQuestionInput,
  CreateTestInput,
  ReorderTestQuestionsInput,
  Test,
  TestDetailResponse,
  TestListResponse,
  TestQuestion,
  UpdateTestInput,
  UpdateTestQuestionInput,
} from '../../types/test';

export const testsApi = {
  list: (examId?: string, type?: string, includeUnpublished = false) => {
    const params = new URLSearchParams();
    if (examId) params.set('examId', examId);
    if (type) params.set('type', type);
    if (includeUnpublished) params.set('includeUnpublished', 'true');
    const query = params.toString();
    return request<TestListResponse>(`/tests${query ? `?${query}` : ''}`);
  },
  get: (id: string) => request<TestDetailResponse>(`/tests/${id}`),
  create: (payload: CreateTestInput) => request<Test>('/tests', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: UpdateTestInput) => request<Test>(`/tests/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  addQuestion: (id: string, payload: AddTestQuestionInput) => request<TestQuestion>(`/tests/${id}/questions`, { method: 'POST', body: JSON.stringify(payload) }),
  updateQuestion: (id: string, questionId: string, payload: UpdateTestQuestionInput) => request<TestQuestion>(`/tests/${id}/questions/${questionId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteQuestion: (id: string, questionId: string) => request<TestQuestion>(`/tests/${id}/questions/${questionId}`, { method: 'DELETE' }),
  reorder: (id: string, payload: ReorderTestQuestionsInput) => request<TestQuestion[]>(`/tests/${id}/reorder`, { method: 'POST', body: JSON.stringify(payload) }),
  publish: (id: string) => request<Test>(`/tests/${id}/publish`, { method: 'POST', body: JSON.stringify({}) }),
  unpublish: (id: string) => request<Test>(`/tests/${id}/unpublish`, { method: 'POST', body: JSON.stringify({}) }),
};
