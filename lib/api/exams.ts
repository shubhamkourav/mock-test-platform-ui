import { request } from '../api';
import type {
  CreateExamInput,
  CreateSectionInput,
  Exam,
  ExamDetail,
  Section,
  UpdateExamInput,
  UpdateSectionInput,
} from '../../types/exam';

export const examsApi = {
  list: (includeInactive = false) => request<Exam[]>(`/exams${includeInactive ? '?includeInactive=true' : ''}`),
  get: (id: string) => request<ExamDetail>(`/exams/${id}`),
  listSections: (examId: string, includeInactive = false) => request<Section[]>(`/exams/${examId}/sections${includeInactive ? '?includeInactive=true' : ''}`),
  create: (payload: CreateExamInput) => request<Exam>('/exams', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: UpdateExamInput) => request<Exam>(`/exams/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  createSection: (examId: string, payload: CreateSectionInput) => request<Section>(`/exams/${examId}/sections`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSection: (id: string, payload: UpdateSectionInput) => request<Section>(`/sections/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSection: (id: string) => request<Section>(`/sections/${id}`, { method: 'DELETE' }),
};
