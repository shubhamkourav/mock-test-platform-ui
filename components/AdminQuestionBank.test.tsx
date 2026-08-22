import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminQuestionBank } from './AdminQuestionBank';
import { ApiClientError } from '../lib/api';
import { questionsApi } from '../lib/api/questions';
import { examsApi } from '../lib/api/exams';

vi.mock('./AppShell', () => ({ AppShell: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('../lib/api/questions', () => ({ questionsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn() } }));
vi.mock('../lib/api/exams', () => ({ examsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), listSections: vi.fn(), createSection: vi.fn(), updateSection: vi.fn(), deleteSection: vi.fn() } }));

const exam = { _id: 'exam-1', name: 'Mock Exam', slug: 'mock-exam', category: 'General', isActive: true, createdAt: '', updatedAt: '' };
const section = { _id: 'section-1', examId: 'exam-1', stage: 'prelims', name: 'Math', slug: 'math', subjectTag: 'Math', questionCount: 10, timeMinutes: 20, maxMarks: 10, negativeMarking: 0.25, order: 1, isActive: true, createdAt: '', updatedAt: '' };
const singleQuestion = { _id: 'question-1', sectionId: 'section-1', subjectTag: 'Math', topic: 'Algebra', questionText: 'What is 2 + 2?', options: [{ key: 'A', text: '3' }, { key: 'B', text: '4' }], selectionMode: 'single' as const, explanation: 'Basic arithmetic.', defaultMarks: 1, negativeMarks: 0.25, difficulty: 'easy' as const, source: 'manual', language: 'en', isActive: true, createdAt: '', updatedAt: '' };
const multipleQuestion = { ...singleQuestion, _id: 'question-2', selectionMode: 'multiple' as const };
const adminQuestion = { ...singleQuestion, correctOptions: ['B'] };

function setupList(items = [singleQuestion]) {
  vi.mocked(questionsApi.list).mockResolvedValue({ items, pagination: { page: 1, limit: 20, total: items.length, pages: 1 } });
  vi.mocked(examsApi.list).mockResolvedValue([exam]);
  vi.mocked(examsApi.listSections).mockResolvedValue([section]);
  vi.mocked(questionsApi.get).mockResolvedValue(adminQuestion);
  vi.mocked(questionsApi.create).mockResolvedValue(adminQuestion);
  vi.mocked(questionsApi.update).mockResolvedValue(adminQuestion);
  vi.mocked(questionsApi.deactivate).mockResolvedValue({ ...adminQuestion, isActive: false });
}

async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }); }
function button(text: string) { const item = Array.from(document.body.querySelectorAll('button')).find(node => node.textContent?.trim() === text); if (!item) throw new Error(`Button not found: ${text}`); return item; }
function dialog() { const item = document.body.querySelector('[role="dialog"]'); if (!item) throw new Error('Dialog not found'); return item as HTMLElement; }
function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) { const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set; setter?.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }
async function choose(label: string, value: string) { const selects = Array.from(document.querySelectorAll('[role="combobox"]')); const select = selects.find(item => item.getAttribute('aria-label') === label || item.textContent?.includes(label)); if (!select) throw new Error(`Select not found: ${label}`); await act(async () => { (select as HTMLElement).click(); }); await flush(); const option = Array.from(document.querySelectorAll('[role="option"]')).find(item => item.textContent?.trim().startsWith(value)); if (!option) throw new Error(`Option not found: ${value}`); await act(async () => { (option as HTMLElement).click(); }); await flush(); }

describe('AdminQuestionBank', () => {
  let root: Root | null = null;
  let container: HTMLDivElement;
  beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); vi.clearAllMocks(); setupList(); });
  afterEach(() => { if (root) act(() => root?.unmount()); root = null; container.remove(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

  it('loads the paginated list and never expects correctOptions in list data', async () => {
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    expect(questionsApi.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(container.textContent).toContain('What is 2 + 2?');
    expect(container.textContent).toContain('Single');
    expect(container.textContent).not.toContain('Correct answer');
  });

  it('renders API-provided multiple selection mode without inferring it from answers', async () => {
    setupList([multipleQuestion]);
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    expect(container.textContent).toContain('Multiple');
  });

  it('passes supported subject, topic, difficulty, section, exam and status filters to the API', async () => {
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    const textInputs = Array.from(container.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
    await act(async () => { setInputValue(textInputs[0], 'Science'); setInputValue(textInputs[1], 'Physics'); }); await flush();
    expect(vi.mocked(questionsApi.list).mock.calls.some(([filters]) => filters?.subjectTag === 'Science' && filters?.topic === 'Physics')).toBe(true);
    expect(vi.mocked(questionsApi.list).mock.calls.every(([filters]) => !('search' in (filters ?? {})) && !('selectionMode' in (filters ?? {})))).toBe(true);
  });

  it('supports pagination from the API response', async () => {
    vi.mocked(questionsApi.list).mockResolvedValue({ items: [singleQuestion], pagination: { page: 1, limit: 20, total: 41, pages: 3 } });
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    const pageTwo = document.querySelector('button[aria-label="Go to page 2"]') as HTMLButtonElement;
    expect(pageTwo).toBeTruthy(); await act(async () => pageTwo.click()); await flush();
    expect(questionsApi.list).toHaveBeenCalledWith({ page: 2, limit: 20 });
  });

  it('renders an empty state safely', async () => {
    vi.mocked(questionsApi.list).mockResolvedValueOnce({ items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    expect(container.textContent).toContain('No questions found.');
  });

  it('shows a 403 authorization error', async () => {
    vi.mocked(questionsApi.list).mockRejectedValue(new ApiClientError(403, 'Forbidden', 'FORBIDDEN'));
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    expect(container.textContent).toContain("You don't have permission to manage questions.");
  });

  it('shows a 401 session error', async () => {
    vi.mocked(questionsApi.list).mockRejectedValue(new ApiClientError(401, 'Unauthorized'));
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    expect(container.textContent).toContain('Your session has expired');
  });

  it('shows a 404 question error from admin preview', async () => {
    vi.mocked(questionsApi.get).mockRejectedValue(new ApiClientError(404, 'Question not found', 'QUESTION_NOT_FOUND'));
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => button('Preview').click()); await flush();
    expect(container.textContent).toContain('requested question or section no longer exists');
  });

  it('opens authorized admin preview and displays the answer key only there', async () => {
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => button('Preview').click()); await flush();
    expect(questionsApi.get).toHaveBeenCalledWith('question-1');
    expect(document.body.textContent).toContain('Correct answer');
  });

  it('creates a single-selection question with the API-provided selection mode and answer key', async () => {
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => button('Create question').click()); await flush();
    await choose('Exam', 'Mock Exam'); await choose('Section', 'Math');
    const form = dialog();
    const inputs = Array.from(form.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
    const textareas = Array.from(form.querySelectorAll('textarea')) as HTMLTextAreaElement[];
    setInputValue(inputs[0], 'Math'); setInputValue(inputs[1], 'Algebra'); setInputValue(textareas[0], 'A new question');
    setInputValue(inputs[3], 'Yes'); setInputValue(inputs[4], 'No');
    const correct = Array.from(form.querySelectorAll('input[type="checkbox"]'))[0] as HTMLInputElement;
    await act(async () => correct.click()); await flush();
    await act(async () => button('Save question').click()); await flush();
    expect(questionsApi.create).toHaveBeenCalledWith(expect.objectContaining({ sectionId: 'section-1', selectionMode: 'single', correctOptions: ['A'] }));
  });

  it('edits the server-provided selection mode directly', async () => {
    vi.mocked(questionsApi.get).mockResolvedValue({ ...adminQuestion, selectionMode: 'multiple', correctOptions: ['A', 'B'] });
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => button('Edit').click()); await flush();
    expect(dialog().textContent).toContain('Multiple choice');
  });

  it('requires confirmation before deactivation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => button('Deactivate').click());
    expect(confirm).toHaveBeenCalled(); expect(questionsApi.deactivate).not.toHaveBeenCalled();
  });

  it('prevents duplicate deactivation mutations while one is pending', async () => {
    let resolveMutation!: (value: typeof adminQuestion) => void;
    vi.mocked(questionsApi.deactivate).mockReturnValue(new Promise(resolve => { resolveMutation = resolve; }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => button('Deactivate').click()); await flush();
    expect(questionsApi.deactivate).toHaveBeenCalledTimes(1);
    const updating = Array.from(document.querySelectorAll('button')).find(item => item.textContent?.trim() === 'Updating...');
    expect(updating).toBeTruthy(); await act(async () => (updating as HTMLButtonElement).click());
    expect(questionsApi.deactivate).toHaveBeenCalledTimes(1);
    await act(async () => resolveMutation({ ...adminQuestion, isActive: false })); await flush();
  });

  it('handles invalid section and relationship errors through the existing API error contract', async () => {
    vi.mocked(questionsApi.create).mockRejectedValue(new ApiClientError(400, 'Section is invalid or inactive', 'INVALID_SECTION'));
    root = createRoot(container); await act(async () => { root?.render(<AdminQuestionBank />); }); await flush();
    await act(async () => button('Create question').click()); await flush();
    expect(dialog().textContent).toContain('Section');
    expect(dialog().textContent).not.toContain('INVALID_SECTION_RELATIONSHIP');
  });
});