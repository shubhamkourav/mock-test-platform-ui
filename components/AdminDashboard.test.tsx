import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboard } from './AdminDashboard';
import { examsApi } from '../lib/api/exams';

vi.mock('next/link', () => ({
  default: ({ children, href }: React.PropsWithChildren<{ href?: string }>) => <a href={href}>{children}</a>,
}));
vi.mock('./AppShell', () => ({ AppShell: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('../lib/api/exams', () => ({
  examsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

const exam = {
  _id: 'exam-1', name: 'UPSC', slug: 'upsc', category: 'civil-services', isActive: true,
  conductingBody: 'UPSC', examPatternNotes: 'Pattern', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  vi.mocked(examsApi.list).mockResolvedValue([exam]);
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function render() {
  await act(async () => { root?.render(<AdminDashboard />); });
}

describe('AdminDashboard', () => {
  it('loads and displays exams with active state', async () => {
    await render();
    expect(examsApi.list).toHaveBeenCalledWith(true);
    expect(host?.textContent).toContain('UPSC');
    expect(host?.textContent).toContain('Active');
    expect(host?.textContent).toContain('Details & sections');
  });

  it('opens the create form without making an automatic mutation', async () => {
    await render();
    const createButton = Array.from(host?.querySelectorAll('button') ?? []).find((button) => button.textContent === 'Create exam') as HTMLButtonElement;
    expect(createButton).toBeTruthy();
    await act(async () => { createButton.click(); });
    expect(host?.textContent).toContain('Create exam');
    expect(examsApi.create).not.toHaveBeenCalled();
  });

  it('uses the update endpoint for deactivation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(examsApi.update).mockResolvedValue({ ...exam, isActive: false });
    await render();
    const deactivate = Array.from(host?.querySelectorAll('button') ?? []).find((button) => button.textContent === 'Deactivate') as HTMLButtonElement;
    expect(deactivate).toBeTruthy();
    await act(async () => { deactivate.click(); });
    expect(examsApi.update).toHaveBeenCalledWith('exam-1', { isActive: false });
  });
});
