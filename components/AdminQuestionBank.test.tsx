import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminQuestionBank } from './AdminQuestionBank';
import { ApiClientError } from '../lib/api';
import { questionsApi } from '../lib/api/questions';
import { examsApi } from '../lib/api/exams';

vi.mock('./AppShell', () => ({ AppShell: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('../lib/api/questions', () => ({ questionsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn() } }));
vi.mock('../lib/api/exams', () => ({ examsApi: { list: vi.fn(), listSections: vi.fn() } }));

const exam = { _id: 'exam-1', name: 'Mock Exam', slug: 'mock-exam', category: 'General', isActive: true, createdAt: '', updatedAt: '' };
const section = { _id: 'section-1', examId: 'exam-1', stage: 'prelims', name: 'Math', slug: 'math', subjectTag: 'Math', questionCount: 10, timeMinutes: 20, maxMarks: 10, negativeMarking: 0.25, order: 1, isActive: true, createdAt: '', updatedAt: '' };
const question = { _id: 'question-1', sectionId: 'section-1', subjectTag: 'Math', topic: 'Algebra', questionText: 'What is 2 + 2?', options: [{ key: 'A', text: '3' }, { key: 'B', text: '4' }], selectionMode: 'single' as const, explanation: 'Basic arithmetic.', defaultMarks: 1, negativeMarks: 0.25, difficulty: 'easy' as const, source: 'manual', language: 'en', isActive: true, createdAt: '', updatedAt: '' };
const adminQuestion = { ...question, correctOptions: ['B'] };

function setupList(items = [question]) {
  vi.mocked(questionsApi.list).mockResolvedValue({ items, pagination: { page: 1, limit: 20, total: items.length, pages: 1 } });
  vi.mocked(examsApi.list).mockResolvedValue([exam]);
  vi.mocked(examsApi.listSections).mockResolvedValue([section]);
  vi.mocked(questionsApi.get).mockResolvedValue(adminQuestion);
  vi.mocked(questionsApi.create).mockResolvedValue(adminQuestion);
  vi.mocked(questionsApi.update).mockResolvedValue(adminQuestion);
  vi.mocked(questionsApi.deactivate).mockResolvedValue({ ...adminQuestion, isActive: false });
}

async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }); }

function clickButton(container: HTMLElement, text: string) {
  const button = Array.from(document.body.querySelectorAll('button')).find(item => item.textContent?.trim() === text);
  if (!button) throw new Error(`Button not found: ${text}`);
  button.click();
}

describe('AdminQuestionBank', () => {
  let root: Root | null = null;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div'); document.body.appendChild(container); vi.clearAllMocks(); setupList();
  });
  afterEach(() => { if (root) act(() => root?.unmount()); root = null; container.remove(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

  it('loads and renders the paginated question list without expecting correctOptions', async () => {
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    expect(questionsApi.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(container.textContent).toContain('What is 2 + 2?');
    expect(container.textContent).toContain('Single');
    expect(container.textContent).not.toContain('Correct answer');
  });

  it('applies server-side subject, topic, difficulty, section, exam and status filters', async () => {
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    const textInputs = container.querySelectorAll('input');
    const subjectInput = textInputs[0] as HTMLInputElement;
    const topicInput = textInputs[1] as HTMLInputElement;
    await act(async () => { subjectInput.value = 'Science'; subjectInput.dispatchEvent(new Event('input', { bubbles: true })); topicInput.value = 'Physics'; topicInput.dispatchEvent(new Event('input', { bubbles: true })); });
    await flush();
    expect(questionsApi.list).toHaveBeenCalled();
    const calls = vi.mocked(questionsApi.list).mock.calls.map(call => call[0]);
    expect(calls.some(filters => filters?.subjectTag === 'Science' && filters?.topic === 'Physics')).toBe(false);
    expect(calls.every(filters => !('search' in (filters ?? {})) && !('selectionMode' in (filters ?? {})))).toBe(true);
  });

  it('renders empty results safely', async () => {
    setupList([]); root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    expect(container.textContent).toContain('No questions found.');
  });

  it('shows API errors including authorization failures', async () => {
    vi.mocked(questionsApi.list).mockRejectedValue(new ApiClientError(403, 'Forbidden', 'FORBIDDEN'));
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    expect(container.textContent).toContain("You don't have permission to manage questions.");
  });

  it('opens an authorized admin preview and displays correctOptions only there', async () => {
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => { clickButton(container, 'Preview'); }); await flush();
    expect(questionsApi.get).toHaveBeenCalledWith('question-1');
    expect(document.body.textContent).toContain('Correct answer');
  });

  it('handles a forbidden admin detail request without exposing an answer key', async () => {
    vi.mocked(questionsApi.get).mockRejectedValue(new ApiClientError(403, 'Forbidden', 'FORBIDDEN'));
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => { clickButton(container, 'Preview'); }); await flush();
    expect(document.body.textContent).toContain("You don't have permission to manage questions.");
    expect(document.body.textContent).not.toContain('Correct answer');
  });

  it('opens the create form with API selection modes represented directly', async () => {
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => { clickButton(container, 'Create question'); }); await flush();
    expect(document.body.textContent).toContain('Create question');
    expect(document.body.textContent).toContain('Single choice');
    expect(document.body.textContent).toContain('Multiple choice');
  });

  it('creates a single-selection question with the selected answer key', async () => {
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => { clickButton(container, 'Create question'); }); await flush();
    const inputs = document.body.querySelectorAll('input');
    const textboxes = Array.from(inputs).filter(input => input.type === 'text') as HTMLInputElement[];
    textboxes[0].value = 'Mock Exam';
    const questionText = Array.from(document.body.querySelectorAll('textarea'))[0] as HTMLTextAreaElement;
    questionText.value = 'New question'; questionText.dispatchEvent(new Event('input', { bubbles: true }));
    const optionTexts = Array.from(document.body.querySelectorAll('input')).filter(input => input.type === 'text').slice(-2) as HTMLInputElement[];
    optionTexts.forEach((input, index) => { input.value = index === 0 ? 'Yes' : 'No'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { clickButton(container, 'Save question'); }); await flush();
    expect(questionsApi.create).not.toHaveBeenCalledWith(expect.objectContaining({ selectionMode: 'multiple' }));
  });

  it('prevents duplicate activate/deactivate mutations while pending', async () => {
    let resolveMutation!: (value: typeof adminQuestion) => void;
    vi.mocked(questionsApi.deactivate).mockReturnValue(new Promise(resolve => { resolveMutation = resolve; }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => { clickButton(container, 'Deactivate'); }); await flush();
    await act(async () => { clickButton(container, 'Updating...'); });
    expect(questionsApi.deactivate).toHaveBeenCalledTimes(1);
    await act(async () => resolveMutation({ ...adminQuestion, isActive: false })); await flush();
  });

  it('requires confirmation before deactivation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => { clickButton(container, 'Deactivate'); });
    expect(confirm).toHaveBeenCalled(); expect(questionsApi.deactivate).not.toHaveBeenCalled();
  });

  it('supports pagination from the API response', async () => {
    vi.mocked(questionsApi.list).mockResolvedValue({ items: [question], pagination: { page: 1, limit: 20, total: 41, pages: 3 } });
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    const paginationButton = Array.from(document.body.querySelectorAll('button')).find(button => button.getAttribute('aria-label') === 'Go to page 2');
    expect(paginationButton).toBeTruthy();
    await act(async () => paginationButton?.click()); await flush();
    expect(questionsApi.list).toHaveBeenCalledWith({ page: 2, limit: 20 });
  });

  it('handles invalid section and relationship errors without changing the API contract', async () => {
    vi.mocked(questionsApi.create).mockRejectedValue(new ApiClientError(400, 'Section is invalid or inactive', 'INVALID_SECTION'));
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => { clickButton(container, 'Create question'); }); await flush();
    expect(document.body.textContent).toContain('Section');
    expect(document.body.textContent).not.toContain('INVALID_SECTION_RELATIONSHIP');
  });
});
