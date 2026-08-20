import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultPage } from './ResultPage';
import { ApiClientError } from '../lib/api';
import { attemptsApi } from '../lib/api/attempts';
import type { AttemptResult } from '../types/attempt';

vi.mock('./AppShell', () => ({ AppShell: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('./DiscoveryStates', () => ({ DiscoveryLoading: () => <div>Loading result</div> }));
vi.mock('../lib/api/attempts', () => ({ attemptsApi: { result: vi.fn(), start: vi.fn() } }));

const baseAttempt = {
  _id: 'attempt-1', userId: 'user-1', testId: 'test-1', startTime: '2026-01-01T00:00:00.000Z',
  endTime: '2026-01-01T00:30:00.000Z', totalScore: 7, correctCount: 2, incorrectCount: 1,
  unattemptedCount: 1, timeTakenSeconds: 1800, status: 'completed' as const,
  sectionResults: [{ sectionId: 'section-1', attempted: 2, correct: 1, incorrect: 1, unattempted: 0, score: 2, timeSpentSeconds: 900 }],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:30:00.000Z',
};

const resultFixture: AttemptResult = {
  attempt: baseAttempt, score: 7, totalMarks: 10, percentage: 70, accuracy: 66.67, correct: 2, incorrect: 1,
  unattempted: 1, timeTaken: 1800, status: 'completed', sections: baseAttempt.sectionResults,
  topics: [{ topic: 'Arithmetic', attempted: 2, correct: 1, incorrect: 1, score: 2, timeSpentSeconds: 900, accuracy: 50 }],
  review: [
    {
      questionId: 'q1', questionText: 'Choose the result of 2 + 2.', options: [{ key: 'a', text: '4' }, { key: 'b', text: '5' }],
      selectionMode: 'single', selectedOptions: ['a'], correctOptions: ['a'], isAttempted: true, isCorrect: true,
      markedForReview: false, marks: 2, negativeMarks: 0.5, marksObtained: 2, timeSpentSeconds: 30,
      topic: 'Arithmetic', subjectTag: 'Math', explanation: '2 + 2 equals 4.',
    },
    {
      questionId: 'q2', questionText: 'Select prime numbers.', options: [{ key: 'a', text: '2' }, { key: 'b', text: '3' }, { key: 'c', text: '4' }],
      selectionMode: 'multiple', selectedOptions: ['a', 'c'], correctOptions: ['a', 'b'], isAttempted: true, isCorrect: false,
      markedForReview: true, marks: 3, negativeMarks: 1, marksObtained: 2, timeSpentSeconds: 45, topic: 'Number theory', subjectTag: 'Math',
    },
    {
      questionId: 'q3', questionText: 'Which planet is known as the Red Planet?', options: [{ key: 'a', text: 'Earth' }, { key: 'b', text: 'Mars' }],
      selectionMode: 'single', selectedOptions: [], correctOptions: ['b'], isAttempted: false, isCorrect: false,
      markedForReview: false, marks: 2, negativeMarks: 0, marksObtained: 0, timeSpentSeconds: 20,
    },
  ],
};

async function renderResult(root: Root, result: AttemptResult) {
  vi.mocked(attemptsApi.result).mockResolvedValue(result);
  await act(async () => {
    root.render(<ResultPage attemptId="attempt-1" />);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('ResultPage', () => {
  let root: Root | null = null;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.mocked(attemptsApi.result).mockReset();
    vi.mocked(attemptsApi.start).mockReset();
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    container.remove();
    vi.restoreAllMocks();
  });

  it('shows loading state and fetches the result once', async () => {
    let resolve!: (value: AttemptResult) => void;
    const pending = new Promise<AttemptResult>((res) => { resolve = res; });
    vi.mocked(attemptsApi.result).mockReturnValue(pending);
    root = createRoot(container);
    await act(async () => {
      root?.render(<ResultPage attemptId="attempt-1" />);
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Loading result');
    expect(attemptsApi.result).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve(resultFixture);
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Test Result');
  });

  it('renders overall metrics, section and topic performance from the API', async () => {
    root = createRoot(container);
    await renderResult(root, resultFixture);
    expect(container.textContent).toContain('7 / 10');
    expect(container.textContent).toContain('70%');
    expect(container.textContent).toContain('66.67%');
    expect(container.textContent).toContain('Correct2');
    expect(container.textContent).toContain('Incorrect1');
    expect(container.textContent).toContain('Unattempted1');
    expect(container.textContent).toContain('30m 0s');
    expect(container.textContent).toContain('Section 1');
    expect(container.textContent).toContain('Arithmetic');
  });

  it('uses selectionMode directly and renders single choice as radio controls', async () => {
    root = createRoot(container);
    await renderResult(root, resultFixture);
    expect(container.textContent).toContain('Single choice');
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('uses selectionMode directly and renders multiple choice as checkbox controls', async () => {
    root = createRoot(container);
    await renderResult(root, resultFixture);
    const secondQuestion = container.querySelector('button[aria-label="Review question 2"]') as HTMLButtonElement;
    await act(async () => { secondQuestion.click(); });
    expect(container.textContent).toContain('Multiple choice');
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(0);
  });

  it('does not infer selection mode from selected or correct option counts', async () => {
    const fixture: AttemptResult = { ...resultFixture, review: [{ ...resultFixture.review[0], selectedOptions: ['a', 'b'], correctOptions: ['a', 'b'], selectionMode: 'single' }] };
    root = createRoot(container);
    await renderResult(root, fixture);
    expect(container.textContent).toContain('Single choice');
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('renders correct, incorrect and unattempted states with read-only answers', async () => {
    root = createRoot(container);
    await renderResult(root, resultFixture);
    expect(container.textContent).toContain('Selected and correct');

    const incorrectQuestion = container.querySelector('button[aria-label="Review question 2"]') as HTMLButtonElement;
    await act(async () => { incorrectQuestion.click(); });
    expect(container.textContent).toContain('Selected but incorrect');

    const unattemptedQuestion = container.querySelector('button[aria-label="Review question 3"]') as HTMLButtonElement;
    await act(async () => { unattemptedQuestion.click(); });
    expect(container.textContent).toContain('Correct answer');
    expect(container.textContent).toContain('Unattempted');

    const inputs = Array.from(container.querySelectorAll('input'));
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.every((input) => input.disabled)).toBe(true);
  });

  it('supports question palette and previous/next review navigation without changing answers', async () => {
    root = createRoot(container);
    await renderResult(root, resultFixture);
    const next = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Next') as HTMLButtonElement;
    await act(async () => { next.click(); });
    expect(container.textContent).toContain('Select prime numbers.');
    expect(container.textContent).toContain('Marked for review');
    const previous = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Previous') as HTMLButtonElement;
    await act(async () => { previous.click(); });
    expect(container.textContent).toContain('Choose the result of 2 + 2.');
    expect(attemptsApi.start).not.toHaveBeenCalled();
  });

  it('handles empty review data safely', async () => {
    root = createRoot(container);
    await renderResult(root, { ...resultFixture, review: [] });
    expect(container.textContent).toContain('No question review is available for this result.');
  });

  it.each([
    [401, 'Your session has expired. Please sign in again.'],
    [403, 'You are not authorized to view this result.'],
    [404, 'This attempt or result could not be found.'],
    [409, 'Result conflict'],
  ])('handles API status %s', async (status, expectedMessage) => {
    root = createRoot(container);
    vi.mocked(attemptsApi.result).mockRejectedValue(new ApiClientError(status, 'Result conflict'));
    await act(async () => {
      root?.render(<ResultPage attemptId="attempt-1" />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).toContain(expectedMessage);
  });

  it('handles network/server failures and provides retry', async () => {
    root = createRoot(container);
    vi.mocked(attemptsApi.result).mockRejectedValueOnce(new Error('network failure')).mockResolvedValueOnce(resultFixture);
    await act(async () => {
      root?.render(<ResultPage attemptId="attempt-1" />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Unable to load the result. Please try again.');
    const retry = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Retry') as HTMLButtonElement;
    await act(async () => {
      retry.click();
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Test Result');
  });

  it('does not expose internal question snapshot fields in the rendered review', async () => {
    root = createRoot(container);
    await renderResult(root, resultFixture);
    expect(container.textContent).not.toContain('questionSnapshot');
    expect(container.textContent).not.toContain('createdAt');
    expect(container.textContent).not.toContain('updatedAt');
  });
});
