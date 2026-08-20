import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttemptPage } from './AttemptPage';
import { ApiClientError } from '../lib/api';
import { attemptsApi } from '../lib/api/attempts';
import { testsApi } from '../lib/api/tests';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('./AppShell', () => ({ AppShell: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('../lib/api/attempts', () => ({
  attemptsApi: {
    get: vi.fn(),
    start: vi.fn(),
    saveAnswer: vi.fn(),
    submit: vi.fn(),
    result: vi.fn(),
  },
}));
vi.mock('../lib/api/tests', () => ({ testsApi: { get: vi.fn() } }));

const attempt = {
  _id: 'attempt-1',
  userId: 'user-1',
  testId: 'test-1',
  startTime: new Date(Date.now() - 30_000).toISOString(),
  totalScore: 0,
  correctCount: 0,
  incorrectCount: 0,
  unattemptedCount: 2,
  timeTakenSeconds: 0,
  status: 'in_progress' as const,
  sectionResults: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const questions = [
  {
    questionId: 'q1',
    questionText: 'Choose one',
    options: [{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }],
    selectionMode: 'single' as const,
    subjectTag: 'Math',
    topic: 'Algebra',
    difficulty: 'easy' as const,
    sectionId: 's1',
    order: 1,
    marks: 1,
  },
  {
    questionId: 'q2',
    questionText: 'Choose all that apply',
    options: [{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }, { key: 'c', text: 'C' }],
    selectionMode: 'multiple' as const,
    subjectTag: 'English',
    topic: 'Vocabulary',
    difficulty: 'medium' as const,
    sectionId: 's1',
    order: 2,
    marks: 1,
  },
];

const test = {
  _id: 'test-1',
  examId: 'exam-1',
  stage: 'prelims',
  title: 'Sample Test',
  type: 'full_mock' as const,
  totalQuestions: 2,
  totalMarks: 2,
  durationMinutes: 30,
  difficulty: 'mixed' as const,
  sections: [],
  settings: { shuffleQuestions: false, shuffleOptions: false, allowResume: true },
  isPublished: true,
  createdBy: 'admin-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  questions: [],
};

function setup(overrides: { answers?: Array<{ questionId: string; selectedOptions: string[]; markedForReview: boolean; timeSpentSeconds: number; isAttempted: boolean }> } = {}) {
  vi.mocked(attemptsApi.get).mockResolvedValue({ attempt, answers: overrides.answers ?? [] });
  vi.mocked(attemptsApi.start).mockResolvedValue({ attempt, questions, resumed: true });
  vi.mocked(testsApi.get).mockResolvedValue(test);
  vi.mocked(attemptsApi.saveAnswer).mockResolvedValue({
    questionId: 'q1', selectedOptions: [], markedForReview: false, timeSpentSeconds: 0, isAttempted: false,
  });
  vi.mocked(attemptsApi.submit).mockResolvedValue(attempt);
  vi.mocked(attemptsApi.result).mockResolvedValue({
    attempt, score: 0, totalMarks: 2, percentage: 0, accuracy: 0, correct: 0, incorrect: 0, unattempted: 2,
    timeTaken: 0, status: 'completed', sections: [], topics: [], review: [],
  });
}

async function renderPage(root: Root) {
  await act(async () => {
    root.render(<AttemptPage attemptId="attempt-1" />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function button(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find((item) => item.textContent?.trim() === text) as HTMLButtonElement;
}

describe('AttemptPage test-taking experience', () => {
  let root: Root | null = null;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    push.mockReset();
    vi.clearAllMocks();
    setup();
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders single-choice questions from selectionMode only', async () => {
    root = createRoot(container);
    await renderPage(root);
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(container.textContent).toContain('Single choice');
  });

  it('renders multiple-choice questions with checkboxes and saves the complete selection', async () => {
    root = createRoot(container);
    await renderPage(root);
    await act(async () => { button(container, 'Next').click(); await Promise.resolve(); });
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
    await act(async () => {
      (container.querySelectorAll('input[type="checkbox"]')[0] as HTMLInputElement).click();
      await Promise.resolve();
    });
    await act(async () => {
      (container.querySelectorAll('input[type="checkbox"]')[1] as HTMLInputElement).click();
      await Promise.resolve();
    });
    expect(attemptsApi.saveAnswer).toHaveBeenLastCalledWith('attempt-1', expect.objectContaining({ questionId: 'q2', selectedOptions: ['a', 'b'] }));
  });

  it('restores persisted answers and review state', async () => {
    setup({ answers: [{ questionId: 'q1', selectedOptions: ['b'], markedForReview: true, timeSpentSeconds: 8, isAttempted: true }] });
    root = createRoot(container);
    await renderPage(root);
    const selected = container.querySelector('input[value="b"]') as HTMLInputElement;
    expect(selected.checked).toBe(true);
    expect(container.textContent).toContain('Unmark review');
  });

  it('navigates next, previous, and palette without leaving valid indexes', async () => {
    root = createRoot(container);
    await renderPage(root);
    await act(async () => { button(container, 'Next').click(); await Promise.resolve(); });
    expect(container.textContent).toContain('Choose all that apply');
    await act(async () => { button(container, 'Previous').click(); await Promise.resolve(); });
    expect(container.textContent).toContain('Choose one');
    const paletteButton = container.querySelector('button[aria-label^="Question 2"]') as HTMLButtonElement;
    await act(async () => { paletteButton.click(); await Promise.resolve(); });
    expect(container.textContent).toContain('Choose all that apply');
  });

  it('persists mark-for-review state', async () => {
    root = createRoot(container);
    await renderPage(root);
    await act(async () => { button(container, 'Mark for review').click(); await Promise.resolve(); });
    expect(attemptsApi.saveAnswer).toHaveBeenLastCalledWith('attempt-1', expect.objectContaining({ questionId: 'q1', markedForReview: true }));
    expect(container.textContent).toContain('Unmark review');
  });

  it('shows save errors without discarding the selected answer', async () => {
    vi.mocked(attemptsApi.saveAnswer).mockRejectedValueOnce(new ApiClientError(403, 'Forbidden'));
    root = createRoot(container);
    await renderPage(root);
    await act(async () => { (container.querySelector('input[value="b"]') as HTMLInputElement).click(); await Promise.resolve(); });
    expect(container.textContent).toContain('not authorized');
    expect((container.querySelector('input[value="b"]') as HTMLInputElement).checked).toBe(true);
  });

  it('requires confirmation and prevents duplicate submit requests', async () => {
    let resolveSubmit!: (value: typeof attempt) => void;
    vi.mocked(attemptsApi.submit).mockReturnValue(new Promise((resolve) => { resolveSubmit = resolve; }));
    root = createRoot(container);
    await renderPage(root);
    await act(async () => { button(container, 'Submit Test').click(); });
    const dialogSubmit = Array.from(container.querySelectorAll('button')).filter((item) => item.textContent?.trim() === 'Submit Test').at(-1) as HTMLButtonElement;
    await act(async () => { dialogSubmit.click(); dialogSubmit.click(); await Promise.resolve(); });
    expect(attemptsApi.submit).toHaveBeenCalledTimes(1);
    await act(async () => { resolveSubmit(attempt); await Promise.resolve(); });
    expect(push).toHaveBeenCalledWith('/attempt/attempt-1/result');
  });

  it('handles an expired submit response through the server result', async () => {
    vi.mocked(attemptsApi.submit).mockRejectedValueOnce(new ApiClientError(409, 'Expired', 'ATTEMPT_EXPIRED'));
    root = createRoot(container);
    await renderPage(root);
    await act(async () => { button(container, 'Submit Test').click(); });
    const dialogSubmit = Array.from(container.querySelectorAll('button')).filter((item) => item.textContent?.trim() === 'Submit Test').at(-1) as HTMLButtonElement;
    await act(async () => { dialogSubmit.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(attemptsApi.result).toHaveBeenCalledWith('attempt-1');
    expect(push).toHaveBeenCalledWith('/attempt/attempt-1/result');
  });

  it('handles 404 and 403 attempt loading errors', async () => {
    vi.mocked(attemptsApi.get).mockRejectedValueOnce(new ApiClientError(404, 'Not found'));
    root = createRoot(container);
    await renderPage(root);
    expect(container.textContent).toContain('could not be found');

    root.unmount();
    root = createRoot(container);
    vi.mocked(attemptsApi.get).mockRejectedValueOnce(new ApiClientError(403, 'Forbidden'));
    await renderPage(root);
    expect(container.textContent).toContain('not authorized');
  });

  it('does not render or use answer-key or scoring fields', async () => {
    root = createRoot(container);
    await renderPage(root);
    expect(container.textContent).not.toContain('correctOptions');
    expect(container.textContent).not.toContain('isCorrect');
    expect(container.textContent).not.toContain('marksObtained');
    expect(container.textContent).not.toContain('questionSnapshot');
    expect(container.textContent).not.toContain('score');
  });
});
