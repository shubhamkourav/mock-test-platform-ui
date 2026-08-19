import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAttemptDeadline, getRemainingSeconds, useAttemptTimer } from './useAttemptTimer';

function TimerHarness({ deadline, active, onChange }: { deadline: number | null; active: boolean; onChange: (seconds: number) => void }) {
  const { remainingSeconds } = useAttemptTimer(deadline, active);
  useEffect(() => onChange(remainingSeconds), [onChange, remainingSeconds]);
  return null;
}

describe('attempt timer foundation', () => {
  let root: Root | null = null;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('derives the deadline from server-provided startTime and test duration', () => {
    const deadline = getAttemptDeadline('2026-01-01T00:00:00.000Z', 30);
    expect(deadline).toBe(Date.parse('2026-01-01T00:30:00.000Z'));
  });

  it('calculates remaining time without creating a client-authoritative deadline', () => {
    const deadline = Date.parse('2026-01-01T00:10:00.000Z');
    expect(getRemainingSeconds(deadline, Date.parse('2026-01-01T00:09:59.100Z'))).toBe(1);
    expect(getRemainingSeconds(deadline, Date.parse('2026-01-01T00:10:00.000Z'))).toBe(0);
    expect(getRemainingSeconds(deadline, Date.parse('2026-01-01T00:10:01.000Z'))).toBe(0);
  });

  it('starts a single interval and updates from the server-derived deadline', async () => {
    const values: number[] = [];
    const onChange = (seconds: number) => values.push(seconds);
    const deadline = Date.now() + 3_000;
    root = createRoot(container);

    await act(async () => {
      root?.render(<TimerHarness deadline={deadline} active onChange={onChange} />);
    });
    expect(values.at(-1)).toBe(3);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(values.at(-1)).toBe(2);

    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    expect(values.at(-1)).toBe(0);
  });

  it('cleans up the previous interval when the deadline or active state changes', async () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const onChange = vi.fn();
    const firstDeadline = Date.now() + 10_000;
    root = createRoot(container);

    await act(async () => {
      root?.render(<TimerHarness deadline={firstDeadline} active onChange={onChange} />);
    });
    await act(async () => {
      root?.render(<TimerHarness deadline={firstDeadline + 10_000} active onChange={onChange} />);
    });
    expect(clearIntervalSpy).toHaveBeenCalled();

    await act(async () => {
      root?.render(<TimerHarness deadline={firstDeadline + 10_000} active={false} onChange={onChange} />);
    });
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('reaches zero without submitting or changing server attempt state', async () => {
    const values: number[] = [];
    const deadline = Date.now() + 1_000;
    root = createRoot(container);

    await act(async () => {
      root?.render(<TimerHarness deadline={deadline} active onChange={(seconds) => values.push(seconds)} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(values.at(-1)).toBe(0);
  });
});
