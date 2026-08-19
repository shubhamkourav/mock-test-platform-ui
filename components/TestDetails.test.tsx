import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestDetails } from './TestDetails';
import { ApiClientError } from '../lib/api';
import { attemptsApi } from '../lib/api/attempts';
import { testsApi } from '../lib/api/tests';
import { examsApi } from '../lib/api/exams';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <a {...props}>{children}</a> }));
vi.mock('./AppShell', () => ({ AppShell: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('./DiscoveryStates', () => ({
  DiscoveryLoading: () => <div>Loading</div>,
  DiscoveryError: ({ message }: { message: string }) => <div>{message}</div>,
}));
vi.mock('../lib/api/attempts', () => ({ attemptsApi: { start: vi.fn() } }));
vi.mock('../lib/api/tests', () => ({ testsApi: { get: vi.fn() } }));
vi.mock('../lib/api/exams', () => ({ examsApi: { get: vi.fn(), listSections: vi.fn() } }));

const testData = {
  _id: 'test-1',
  examId: 'exam-1',
  title: 'Mock Test',
  type: 'full_mock' as const,
  description: 'Test',
  totalQuestions: 10,
  totalMarks: 100,
  durationMinutes: 60,
  difficulty: 'medium' as const,
  sections: [],
  questions: [],
  isPublished: true,
};

const examData = { _id: 'exam-1', name: 'Exam', description: 'Exam description', isActive: true };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function renderTestDetails(root: Root, container: HTMLDivElement) {
  await act(async () => {
    root.render(<TestDetails testId="test-1" />);
    await Promise.resolve();
    await Promise.resolve();
  });
  return container.querySelector('button[aria-busy]') as HTMLButtonElement | null;
}

describe('TestDetails attempt lifecycle', () => {
  let root: Root | null = null;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    push.mockReset();
    vi.mocked(testsApi.get).mockResolvedValue(testData);
    vi.mocked(examsApi.get).mockResolvedValue(examData);
    vi.mocked(examsApi.listSections).mockResolvedValue([]);
    vi.mocked(attemptsApi.start).mockReset();
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    container.remove();
    vi.restoreAllMocks();
  });

  it('does not create an attempt while viewing test details', async () => {
    root = createRoot(container);
    await renderTestDetails(root, container);
    expect(attemptsApi.start).not.toHaveBeenCalled();
  });

  it('creates an attempt only after an explicit click and disables the button while pending', async () => {
    const request = deferred<{ attempt: { _id: string } }>();
    vi.mocked(attemptsApi.start).mockReturnValue(request.promise);
    root = createRoot(container);
    const button = await renderTestDetails(root, container);
    expect(button).not.toBeNull();

    await act(async () => {
      button?.click();
    });
    expect(attemptsApi.start).toHaveBeenCalledTimes(1);
    expect(button?.disabled).toBe(true);

    await act(async () => {
      button?.click();
    });
    expect(attemptsApi.start).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve({ attempt: { _id: 'attempt-1' } });
      await Promise.resolve();
    });
    expect(push).toHaveBeenCalledWith('/attempt/attempt-1');
  });

  it('uses the returned attempt id for a resumed attempt', async () => {
    vi.mocked(attemptsApi.start).mockResolvedValue({ attempt: { _id: 'attempt-existing' }, questions: [], resumed: true });
    root = createRoot(container);
    const button = await renderTestDetails(root, container);

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(attemptsApi.start).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/attempt/attempt-existing');
  });

  it('renders a friendly start error and remains retryable', async () => {
    vi.mocked(attemptsApi.start).mockRejectedValue(new ApiClientError('Forbidden', 403, 'FORBIDDEN'));
    root = createRoot(container);
    const button = await renderTestDetails(root, container);

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('You are not authorized to start this test.');
    expect(button?.disabled).toBe(false);
  });
});
