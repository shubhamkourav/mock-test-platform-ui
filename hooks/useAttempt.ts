'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Attempt, AttemptAnswer } from '../types/attempt';
import type { TestDetailResponse } from '../types/test';
import { attemptsApi } from '../lib/api/attempts';
import { testsApi } from '../lib/api/tests';
import { ApiClientError } from '../lib/api';

export interface AttemptState {
  attempt: Attempt | null;
  test: TestDetailResponse | null;
  answers: AttemptAnswer[];
  loading: boolean;
  error: ApiClientError | Error | null;
}

export function useAttempt(attemptId: string): AttemptState & { reload: () => Promise<void> } {
  const [state, setState] = useState<AttemptState>({ attempt: null, test: null, answers: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const attemptResponse = await attemptsApi.get(attemptId);
      const test = await testsApi.get(attemptResponse.attempt.testId);
      setState({ attempt: attemptResponse.attempt, test, answers: attemptResponse.answers, loading: false, error: null });
    } catch (error) {
      setState({ attempt: null, test: null, answers: [], loading: false, error: error instanceof ApiClientError || error instanceof Error ? error : new Error('Unable to load the attempt.') });
    }
  }, [attemptId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
