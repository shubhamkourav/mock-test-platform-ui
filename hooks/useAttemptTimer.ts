'use client';

import { useEffect, useState } from 'react';

export function getAttemptDeadline(startTime: string, durationMinutes: number): number {
  return new Date(startTime).getTime() + durationMinutes * 60_000;
}

export function getRemainingSeconds(deadlineAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineAt - now) / 1000));
}

export function useAttemptTimer(deadlineAt: number | null, active: boolean) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => deadlineAt === null ? 0 : getRemainingSeconds(deadlineAt));

  useEffect(() => {
    if (deadlineAt === null || !active) {
      setRemainingSeconds(deadlineAt === null ? 0 : getRemainingSeconds(deadlineAt));
      return;
    }

    const update = () => setRemainingSeconds(getRemainingSeconds(deadlineAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deadlineAt, active]);

  return {
    remainingSeconds,
    expired: deadlineAt !== null && remainingSeconds === 0,
  };
}
