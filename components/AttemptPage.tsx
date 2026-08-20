'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { ApiClientError } from '../lib/api';
import { attemptsApi } from '../lib/api/attempts';
import { testsApi } from '../lib/api/tests';
import { AppShell } from './AppShell';
import { getAttemptDeadline, useAttemptTimer } from '../hooks/useAttemptTimer';
import type { Attempt, AttemptAnswer, AttemptQuestion, SelectionMode } from '../types/attempt';

type ActiveAttempt = Pick<Attempt, '_id' | 'testId' | 'startTime' | 'status'>;
type SavePayload = Parameters<typeof attemptsApi.saveAnswer>[1];

function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiClientError)) return fallback;
  if (error.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.status === 403) return 'You are not authorized to access this attempt.';
  if (error.status === 404) return 'This attempt or test could not be found.';
  if (error.status === 409 && error.code === 'ATTEMPT_EXPIRED') return 'The server reports that this attempt has expired.';
  if (error.status === 400) return error.message || fallback;
  return fallback;
}

function getSubmitErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 409 && error.code === 'ATTEMPT_EXPIRED') return 'The server reports that this attempt has expired.';
    if (error.status === 403) return 'You are not authorized to submit this attempt.';
    if (error.status === 404) return 'This attempt is no longer available.';
    if (error.status === 400) return error.message || 'The submission is invalid.';
  }
  return 'Could not submit the test. Please try again.';
}

function isSelectionMode(value: string): value is SelectionMode {
  return value === 'single' || value === 'multiple';
}

export function AttemptPage({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<ActiveAttempt | null>(null);
  const [questions, setQuestions] = useState<AttemptQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testTitle, setTestTitle] = useState('Mock test');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const questionStartedAt = useRef(Date.now());
  const saveQueues = useRef(new Map<string, Promise<void>>());

  const loadAttempt = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const attemptResponse = await attemptsApi.get(attemptId);
      if (attemptResponse.attempt.status !== 'in_progress') {
        router.push(`/attempt/${attemptId}/result`);
        return;
      }

      const test = await testsApi.get(attemptResponse.attempt.testId);
      const resumed = await attemptsApi.start(attemptResponse.attempt.testId);
      if (resumed.attempt._id !== attemptId) throw new Error('The server returned a different attempt.');

      const safeAttempt: ActiveAttempt = {
        _id: resumed.attempt._id,
        testId: resumed.attempt.testId,
        startTime: resumed.attempt.startTime,
        status: resumed.attempt.status,
      };
      const restoredAnswers = Object.fromEntries(attemptResponse.answers.map((answer: AttemptAnswer) => [answer.questionId, answer.selectedOptions]));
      const restoredReview = Object.fromEntries(attemptResponse.answers.map((answer: AttemptAnswer) => [answer.questionId, answer.markedForReview]));

      setAttempt(safeAttempt);
      setQuestions(resumed.questions);
      setAnswers(restoredAnswers);
      setMarkedForReview(restoredReview);
      setTestTitle(test.title);
      setDeadline(getAttemptDeadline(safeAttempt.startTime, test.durationMinutes));
      questionStartedAt.current = Date.now();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load this attempt.'));
    } finally {
      setLoading(false);
    }
  }, [attemptId, router]);

  useEffect(() => { void loadAttempt(); }, [loadAttempt]);

  const { remainingSeconds } = useAttemptTimer(deadline, attempt?.status === 'in_progress');
  const question = questions[currentIndex];
  const selected = question ? answers[question.questionId] ?? [] : [];
  const answeredCount = useMemo(() => questions.filter((item) => (answers[item.questionId] ?? []).length > 0).length, [answers, questions]);
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerWarning = remainingSeconds <= 60 && remainingSeconds > 0;
  const timerAtZero = deadline !== null && remainingSeconds === 0;

  const enqueueSave = useCallback((questionId: string, payload: SavePayload) => {
    const previous = saveQueues.current.get(questionId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      setSavingQuestionId(questionId);
      await attemptsApi.saveAnswer(attemptId, payload);
    }).finally(() => {
      if (saveQueues.current.get(questionId) === next) saveQueues.current.delete(questionId);
      setSavingQuestionId((current) => current === questionId ? null : current);
    });
    saveQueues.current.set(questionId, next);
    return next;
  }, [attemptId]);

  const persistQuestion = useCallback(async (questionToSave: AttemptQuestion, selectedOptions: string[], reviewValue: boolean) => {
    const elapsed = Math.max(0, Math.floor((Date.now() - questionStartedAt.current) / 1000));
    await enqueueSave(questionToSave.questionId, {
      questionId: questionToSave.questionId,
      selectedOptions,
      markedForReview: reviewValue,
      timeSpentSeconds: elapsed,
    });
    questionStartedAt.current = Date.now();
  }, [enqueueSave]);

  const waitForPendingSave = useCallback(async (questionId: string) => {
    await saveQueues.current.get(questionId);
  }, []);

  async function selectOption(optionKey: string) {
    if (!question) return;
    const next = question.selectionMode === 'multiple'
      ? selected.includes(optionKey) ? selected.filter((key) => key !== optionKey) : [...selected, optionKey]
      : [optionKey];
    setAnswers((current) => ({ ...current, [question.questionId]: next }));
    setSaveError('');
    try {
      await persistQuestion(question, next, markedForReview[question.questionId] ?? false);
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Could not save your answer. Your selection is still visible; please retry.'));
    }
  }

  async function toggleReview() {
    if (!question) return;
    const next = !(markedForReview[question.questionId] ?? false);
    setMarkedForReview((current) => ({ ...current, [question.questionId]: next }));
    setSaveError('');
    try {
      await persistQuestion(question, selected, next);
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Could not save the review state. Please retry.'));
    }
  }

  async function goTo(index: number) {
    if (index < 0 || index >= questions.length || index === currentIndex) return;
    if (question) {
      try {
        await waitForPendingSave(question.questionId);
      } catch (err) {
        setSaveError(getErrorMessage(err, 'Could not save the current answer. Please retry before continuing.'));
        return;
      }
    }
    setCurrentIndex(index);
    questionStartedAt.current = Date.now();
    setSaveError('');
  }

  async function retrySave() {
    if (!question) return;
    setSaveError('');
    try {
      await persistQuestion(question, selected, markedForReview[question.questionId] ?? false);
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Could not save your answer. Please retry.'));
    }
  }

  async function submit() {
    if (submitting || !attempt) return;
    setSubmitting(true);
    setSaveError('');
    try {
      if (question) await waitForPendingSave(question.questionId);
      await attemptsApi.submit(attempt._id);
      router.push(`/attempt/${attempt._id}/result`);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409 && err.code === 'ATTEMPT_EXPIRED') {
        try {
          await attemptsApi.result(attempt._id);
          router.push(`/attempt/${attempt._id}/result`);
          return;
        } catch (resultError) {
          setSaveError(getSubmitErrorMessage(resultError));
        }
      } else {
        setSaveError(getSubmitErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  }

  if (loading) return <AppShell><Typography>Loading attempt...</Typography></AppShell>;
  if (error) return <AppShell><Stack spacing={2}><Alert severity="error">{error}</Alert><Button variant="outlined" onClick={() => void loadAttempt()}>Retry</Button></Stack></AppShell>;
  if (!attempt || !question) return <AppShell><Alert severity="error">No active attempt questions are available.</Alert></AppShell>;

  const selectionMode = isSelectionMode(question.selectionMode) ? question.selectionMode : 'single';

  return (
    <AppShell>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h5" fontWeight={800}>{testTitle}</Typography>
            <Typography color="text.secondary">Question {currentIndex + 1} of {questions.length}</Typography>
          </Box>
          <Chip color={timerWarning || timerAtZero ? 'error' : 'primary'} label={`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`} aria-label="time remaining" />
        </Stack>

        {timerAtZero && <Alert severity="warning">The timer display has reached 00:00. The server remains authoritative for the attempt state.</Alert>}
        {saveError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void retrySave()}>Retry</Button>}>{saveError}</Alert>}

        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Progress</Typography>
            <Typography variant="body2">{answeredCount}/{questions.length} answered</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress} />
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
          <Card sx={{ flex: 1 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2.5}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Chip label={selectionMode === 'multiple' ? 'Multiple choice' : 'Single choice'} size="small" variant="outlined" />
                  <Typography color="text.secondary">{question.marks} marks</Typography>
                </Stack>
                <Typography variant="h6">{question.questionText}</Typography>

                {selectionMode === 'multiple' ? (
                  <FormGroup>
                    {question.options.map((option) => (
                      <FormControlLabel
                        key={option.key}
                        control={<Checkbox checked={selected.includes(option.key)} onChange={() => void selectOption(option.key)} disabled={savingQuestionId === question.questionId} />}
                        label={option.text}
                      />
                    ))}
                  </FormGroup>
                ) : (
                  <RadioGroup value={selected[0] ?? ''} onChange={(event) => void selectOption(event.target.value)}>
                    {question.options.map((option) => (
                      <FormControlLabel
                        key={option.key}
                        value={option.key}
                        control={<Radio disabled={savingQuestionId === question.questionId} />}
                        label={option.text}
                      />
                    ))}
                  </RadioGroup>
                )}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button disabled={currentIndex === 0} onClick={() => void goTo(currentIndex - 1)}>Previous</Button>
                  <Button variant={markedForReview[question.questionId] ? 'contained' : 'outlined'} onClick={() => void toggleReview()} disabled={savingQuestionId === question.questionId}>
                    {markedForReview[question.questionId] ? 'Unmark review' : 'Mark for review'}
                  </Button>
                  <Button disabled={currentIndex === questions.length - 1} variant="contained" onClick={() => void goTo(currentIndex + 1)}>Next</Button>
                  <Button color="error" variant="outlined" onClick={() => setConfirmSubmit(true)} disabled={submitting} sx={{ ml: { sm: 'auto' } }}>
                    {submitting ? 'Submitting...' : 'Submit Test'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ width: { xs: '100%', md: 320 } }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography fontWeight={800}>Question palette</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {questions.map((item, index) => {
                    const answered = (answers[item.questionId] ?? []).length > 0;
                    const reviewed = markedForReview[item.questionId] ?? false;
                    return (
                      <Button
                        key={item.questionId}
                        size="small"
                        variant={index === currentIndex ? 'contained' : 'outlined'}
                        color={reviewed ? 'warning' : answered ? 'success' : 'inherit'}
                        aria-label={`Question ${index + 1}${answered ? ', answered' : ', unanswered'}${reviewed ? ', marked for review' : ''}`}
                        onClick={() => void goTo(index)}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </Stack>
                <Stack spacing={0.5} sx={{ pt: 1 }}>
                  <Typography variant="caption">Answered: {answeredCount}</Typography>
                  <Typography variant="caption">Unanswered: {questions.length - answeredCount}</Typography>
                  <Typography variant="caption">Marked: {Object.values(markedForReview).filter(Boolean).length}</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <Dialog open={confirmSubmit} onClose={() => !submitting && setConfirmSubmit(false)}>
        <DialogTitle>Submit test?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">You have answered {answeredCount} of {questions.length} questions. The server will calculate the final result.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmit(false)} disabled={submitting}>Continue Test</Button>
          <Button color="error" variant="contained" onClick={() => void submit()} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Test'}</Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
