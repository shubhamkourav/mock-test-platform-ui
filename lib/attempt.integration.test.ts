import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attemptsApi } from './api/attempts';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('attempt integration contracts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('distinguishes a newly created attempt from a resumed attempt', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({
      success: true,
      message: 'Existing attempt resumed',
      data: {
        attempt: {
          _id: 'attempt-1',
          userId: 'user-1',
          testId: 'test-1',
          startTime: '2026-01-01T00:00:00.000Z',
          totalScore: 0,
          correctCount: 0,
          incorrectCount: 0,
          unattemptedCount: 1,
          timeTakenSeconds: 0,
          status: 'in_progress',
          sectionResults: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        questions: [],
        resumed: true,
      },
    }));

    const response = await attemptsApi.start('test-1');
    expect(response.resumed).toBe(true);
    expect(response.attempt._id).toBe('attempt-1');
  });

  it('preserves server authorization and expiration errors', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'Forbidden', code: 'FORBIDDEN' }, 403))
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'Attempt deadline has passed', code: 'ATTEMPT_EXPIRED' }, 409));

    await expect(attemptsApi.get('attempt-1')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    await expect(attemptsApi.submit('attempt-1')).rejects.toMatchObject({ status: 409, code: 'ATTEMPT_EXPIRED' });
  });

  it('keeps answer data behind the server-defined attempt lifecycle', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({
      success: true,
      message: 'OK',
      data: {
        attempt: { _id: 'attempt-1', status: 'in_progress' },
        answers: [{ questionId: 'q-1', selectedOptions: ['a'], markedForReview: false, timeSpentSeconds: 4, isAttempted: true }],
      },
    }));

    const response = await attemptsApi.get('attempt-1');
    expect(response.answers[0]).toEqual({
      questionId: 'q-1',
      selectedOptions: ['a'],
      markedForReview: false,
      timeSpentSeconds: 4,
      isAttempted: true,
    });
    expect(response.answers[0]).not.toHaveProperty('correctOptions');
    expect(response.answers[0]).not.toHaveProperty('isCorrect');
    expect(response.answers[0]).not.toHaveProperty('marksObtained');
  });
});
