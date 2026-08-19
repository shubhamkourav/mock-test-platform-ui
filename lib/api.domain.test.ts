import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from './api';
import { authApi } from './api/auth';
import { examsApi } from './api/exams';
import { questionsApi } from './api/questions';
import { testsApi } from './api/tests';
import { attemptsApi } from './api/attempts';
import type { StudentQuestion } from '../types/question';
import type { AttemptAnswer, AttemptQuestion } from '../types/attempt';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('typed domain API modules', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns typed auth contracts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({
      success: true,
      message: 'Logged in',
      data: { accessToken: 'access', refreshToken: 'refresh', user: { id: '1', name: 'Student', email: 'student@example.com', role: 'student' } },
    }));

    const response = await authApi.login({ email: 'student@example.com', password: 'password' });
    expect(response.user.role).toBe('student');
    expect(response.accessToken).toBe('access');
  });

  it('supports refresh, me, and logout contracts', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Token refreshed', data: { accessToken: 'access-2', refreshToken: 'refresh-2', user: { id: '1', name: 'Student', email: 'student@example.com', role: 'student' } } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Current user', data: { id: '1', name: 'Student', email: 'student@example.com', role: 'student' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Logged out', data: null }));

    expect((await authApi.refresh('refresh-1')).user.id).toBe('1');
    expect((await authApi.me()).email).toBe('student@example.com');
    await expect(authApi.logout('refresh-2')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('supports exam and section endpoints', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: [] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: { _id: 'exam-1', name: 'Exam', slug: 'exam', category: 'General', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: [] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Exam created', data: { _id: 'exam-1', name: 'Exam', slug: 'exam', category: 'General', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Exam updated', data: { _id: 'exam-1', name: 'Updated', slug: 'exam', category: 'General', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Section created', data: { _id: 'section-1' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Section updated', data: { _id: 'section-1' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Section deactivated', data: { _id: 'section-1' } }));

    expect(await examsApi.list()).toEqual([]);
    expect((await examsApi.get('exam-1'))._id).toBe('exam-1');
    expect(await examsApi.listSections('exam-1')).toEqual([]);
    expect((await examsApi.create({ name: 'Exam', slug: 'exam', category: 'General' })).name).toBe('Exam');
    expect((await examsApi.update('exam-1', { name: 'Updated' })).name).toBe('Updated');
    expect((await examsApi.createSection('exam-1', { name: 'Section', slug: 'section', subjectTag: 'Math', questionCount: 1, timeMinutes: 10, maxMarks: 1 }))._id).toBe('section-1');
    expect((await examsApi.updateSection('section-1', { name: 'Updated' }))._id).toBe('section-1');
    expect((await examsApi.deleteSection('section-1'))._id).toBe('section-1');
  });

  it('supports question filters and admin mutations', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: { _id: 'q-1', sectionId: 'section-1', subjectTag: 'Math', topic: 'Algebra', questionText: '2+2?', options: [{ key: 'a', text: '4' }], correctOptions: ['a'], defaultMarks: 1, negativeMarks: 0, difficulty: 'easy', source: 'original', language: 'en', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Question created', data: { _id: 'q-1', correctOptions: ['a'] } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Question updated', data: { _id: 'q-1', correctOptions: ['a'] } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Question deactivated', data: { _id: 'q-1', correctOptions: ['a'], isActive: false } }));

    await questionsApi.list({ examId: 'exam-1', sectionId: 'section-1', subject: 'Math', subjectTag: 'Math', topic: 'Algebra', difficulty: 'easy', active: true, page: 2, limit: 10 });
    const listUrl = String(fetchMock.mock.calls[0][0]);
    expect(listUrl).toContain('examId=exam-1');
    expect(listUrl).toContain('sectionId=section-1');
    expect(listUrl).toContain('active=true');
    expect((await questionsApi.get('q-1'))._id).toBe('q-1');
    expect((await questionsApi.create({ sectionId: 'section-1', subjectTag: 'Math', topic: 'Algebra', questionText: '2+2?', options: [{ key: 'a', text: '4' }], correctOptions: ['a'] })).correctOptions).toEqual(['a']);
    expect((await questionsApi.update('q-1', { topic: 'Arithmetic' }))._id).toBe('q-1');
    expect((await questionsApi.deactivate('q-1')).isActive).toBe(false);
  });

  it('supports test discovery, builder endpoints, ordering, and publication', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: [] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: { _id: 'test-1', examId: 'exam-1', title: 'Mock', type: 'full_mock', totalQuestions: 1, totalMarks: 1, durationMinutes: 10, difficulty: 'mixed', sections: [], settings: { shuffleQuestions: false, shuffleOptions: false, allowResume: true }, isPublished: false, createdBy: 'admin-1', createdAt: '2026-01-01', updatedAt: '2026-01-01', questions: [] } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Test created', data: { _id: 'test-1' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Test updated', data: { _id: 'test-1' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Question added', data: { _id: 'mapping-1', testId: 'test-1', questionId: 'q-1', sectionId: 'section-1', order: 1, marks: 1 } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Test question updated', data: { _id: 'mapping-1' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Test question removed', data: { _id: 'mapping-1' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Questions reordered', data: [] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Test published', data: { _id: 'test-1', isPublished: true } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Test unpublished', data: { _id: 'test-1', isPublished: false } }));

    expect(await testsApi.list('exam-1', 'full_mock', true)).toEqual([]);
    expect((await testsApi.get('test-1'))._id).toBe('test-1');
    expect((await testsApi.create({ examId: 'exam-1', title: 'Mock', type: 'full_mock', totalQuestions: 1, totalMarks: 1, durationMinutes: 10, sections: [{ sectionId: 'section-1', questionCount: 1, marks: 1, durationMinutes: 10 }] }))._id).toBe('test-1');
    expect((await testsApi.update('test-1', { title: 'Updated' }))._id).toBe('test-1');
    expect((await testsApi.addQuestion('test-1', { questionId: 'q-1', order: 1 })).questionId).toBe('q-1');
    expect((await testsApi.updateQuestion('test-1', 'q-1', { marks: 2 }))._id).toBe('mapping-1');
    expect((await testsApi.deleteQuestion('test-1', 'q-1'))._id).toBe('mapping-1');
    expect(await testsApi.reorder('test-1', { items: [{ questionId: 'q-1', order: 1 }] })).toEqual([]);
    expect((await testsApi.publish('test-1')).isPublished).toBe(true);
    expect((await testsApi.unpublish('test-1')).isPublished).toBe(false);
  });

  it('supports attempt lifecycle and result contracts', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Attempt started', data: { attempt: { _id: 'attempt-1', userId: 'user-1', testId: 'test-1', startTime: '2026-01-01T00:00:00.000Z', totalScore: 0, correctCount: 0, incorrectCount: 0, unattemptedCount: 1, timeTakenSeconds: 0, status: 'in_progress', sectionResults: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' }, questions: [] } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: { attempt: { _id: 'attempt-1' }, answers: [] } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Answer saved', data: { questionId: 'q-1', selectedOptions: ['a'], markedForReview: true, timeSpentSeconds: 5, isAttempted: true } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'Attempt submitted', data: { _id: 'attempt-1', status: 'completed' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'OK', data: { attempt: { _id: 'attempt-1' }, score: 1, totalMarks: 1, percentage: 100, accuracy: 100, correct: 1, incorrect: 0, unattempted: 0, timeTaken: 5, status: 'completed', sections: [], topics: [], review: [] } }));

    expect((await attemptsApi.start('test-1')).attempt.status).toBe('in_progress');
    expect((await attemptsApi.get('attempt-1')).attempt._id).toBe('attempt-1');
    expect((await attemptsApi.saveAnswer('attempt-1', { questionId: 'q-1', selectedOptions: ['a'], markedForReview: true, timeSpentSeconds: 5 })).isAttempted).toBe(true);
    expect((await attemptsApi.submit('attempt-1')).status).toBe('completed');
    expect((await attemptsApi.result('attempt-1')).review).toEqual([]);
  });

  it('preserves typed 403 and 409 error information', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'Forbidden', code: 'FORBIDDEN' }, 403))
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'Attempt deadline has passed', code: 'ATTEMPT_EXPIRED' }, 409));

    await expect(examsApi.create({ name: 'Exam', slug: 'exam', category: 'General' })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    await expect(attemptsApi.submit('attempt-1')).rejects.toMatchObject({ status: 409, code: 'ATTEMPT_EXPIRED' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// Compile-time security boundaries: these fields are intentionally absent from
// pre-submission student/attempt types and only exist on post-submission review.
const studentQuestion = {} as StudentQuestion;
// @ts-expect-error correctOptions must never be part of StudentQuestion.
studentQuestion.correctOptions;
const attemptQuestion = {} as AttemptQuestion;
// @ts-expect-error scoring data must never be part of AttemptQuestion.
attemptQuestion.marksObtained;
const attemptAnswer = {} as AttemptAnswer;
// @ts-expect-error scoring data must never be part of AttemptAnswer.
attemptAnswer.isCorrect;
