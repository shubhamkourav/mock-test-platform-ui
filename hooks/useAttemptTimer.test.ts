import { describe, expect, it } from 'vitest';
import { getAttemptDeadline, getRemainingSeconds } from './useAttemptTimer';

describe('attempt timer foundation', () => {
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
});
