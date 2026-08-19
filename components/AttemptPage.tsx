'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Grid, Radio, RadioGroup, FormControlLabel, Stack, Typography } from '@mui/material';
import { ApiClientError } from '../lib/api';
import { attemptsApi } from '../lib/api/attempts';
import { AppShell } from './AppShell';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { resetTest, setAnswer, setCurrentIndex, setReviewState } from '../store/slices/testSlice';
import { useAttempt } from '../hooks/useAttempt';
import { getAttemptDeadline, useAttemptTimer } from '../hooks/useAttemptTimer';
import type { StudentTestQuestion } from '../types/test';

function getAttemptErrorMessage(error: unknown) {
  if (!(error instanceof ApiClientError)) return error instanceof Error ? error.message : 'Unable to load the attempt.';
  if (error.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.status === 403) return 'You are not authorized to access this attempt.';
  if (error.status === 404) return 'This attempt could not be found.';
  if (error.status === 409) return error.code === 'ATTEMPT_EXPIRED'
    ? 'This attempt has expired. The server has finalized it.'
    : 'This attempt is no longer available.';
  if (error.status === 400) return error.message || 'The attempt request is invalid.';
  return 'Unable to load the attempt. Please try again.';
}

function getSubmissionErrorMessage(error: unknown) {
  if (error instanceof ApiClientError && error.status === 409 && error.code === 'ATTEMPT_EXPIRED') {
    return 'The server has expired this attempt. Opening the result...';
  }
  if (error instanceof ApiClientError && error.status === 403) return 'You are not authorized to submit this attempt.';
  if (error instanceof ApiClientError && error.status === 404) return 'This attempt is no longer available.';
  return error instanceof Error ? error.message : 'Could not submit the attempt.';
}

export function AttemptPage({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { answers, markedForReview, currentIndex } = useAppSelector((state) => state.test);
  const { attempt, test, answers: restoredAnswers, loading, error } = useAttempt(attemptId);
  const [questions, setQuestions] = useState<StudentTestQuestion[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [pageError, setPageError] = useState('');
  const questionStartedAt = useRef<number>(Date.now());
  const submitting = useRef(false);

  useEffect(() => {
    dispatch(resetTest());
  }, [dispatch, attemptId]);

  useEffect(() => {
    if (!attempt || !test) return;
    setQuestions(test.questions.map((question) => question.questionId));
    setDeadline(getAttemptDeadline(attempt.startTime, test.durationMinutes));
    questionStartedAt.current = Date.now();
    for (const answer of restoredAnswers) {
      dispatch(setAnswer({ questionId: answer.questionId, options: answer.selectedOptions ?? [] }));
      dispatch(setReviewState({ questionId: answer.questionId, value: !!answer.markedForReview }));
    }
  }, [attempt, test, restoredAnswers, dispatch]);

  const { remainingSeconds } = useAttemptTimer(deadline, attempt?.status === 'in_progress');

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress' || !deadline || remainingSeconds !== 0 || submitting.current) return;
    submitting.current = true;
    void attemptsApi.submit(attemptId)
      .then(() => router.push(`/attempt/${attemptId}/result`))
      .catch((submissionError) => {
        if (submissionError instanceof ApiClientError && submissionError.status === 409 && submissionError.code === 'ATTEMPT_EXPIRED') {
          router.push(`/attempt/${attemptId}/result`);
          return;
        }
        submitting.current = false;
        setPageError(getSubmissionErrorMessage(submissionError));
      });
  }, [attempt, attemptId, deadline, remainingSeconds, router]);

  const question = questions[currentIndex];
  const selected = question ? answers[question._id] ?? [] : [];
  const minutes = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const answeredCount = useMemo(() => Object.values(answers).filter((value) => value.length).length, [answers]);

  async function persistCurrentQuestion(reviewValue = question ? markedForReview[question._id] ?? false : false, selectedOptions = selected) {
    if (!question) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - questionStartedAt.current) / 1000));
    await attemptsApi.saveAnswer(attemptId, {
      questionId: question._id,
      selectedOptions,
      markedForReview: reviewValue,
      timeSpentSeconds: elapsed,
    });
    questionStartedAt.current = Date.now();
  }

  async function choose(value: string) {
    if (!question) return;
    const next = [value];
    dispatch(setAnswer({ questionId: question._id, options: next }));
    try {
      await persistCurrentQuestion(undefined, next);
    } catch (saveError) {
      setPageError(saveError instanceof Error ? saveError.message : 'Could not save the answer.');
    }
  }

  async function toggleReview() {
    if (!question) return;
    const next = !markedForReview[question._id];
    dispatch(setReviewState({ questionId: question._id, value: next }));
    try {
      await persistCurrentQuestion(next);
    } catch (saveError) {
      setPageError(saveError instanceof Error ? saveError.message : 'Could not save the review state.');
    }
  }

  async function goTo(index: number) {
    if (!question || index === currentIndex) {
      dispatch(setCurrentIndex(index));
      return;
    }
    try {
      await persistCurrentQuestion();
      dispatch(setCurrentIndex(index));
      questionStartedAt.current = Date.now();
    } catch (saveError) {
      setPageError(saveError instanceof Error ? saveError.message : 'Could not save the answer.');
    }
  }

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await persistCurrentQuestion();
      await attemptsApi.submit(attemptId);
      router.push(`/attempt/${attemptId}/result`);
    } catch (submitError) {
      if (submitError instanceof ApiClientError && submitError.status === 409 && submitError.code === 'ATTEMPT_EXPIRED') {
        router.push(`/attempt/${attemptId}/result`);
        return;
      }
      submitting.current = false;
      setPageError(getSubmissionErrorMessage(submitError));
    }
  }

  if (loading) return <AppShell><Typography>Loading attempt...</Typography></AppShell>;
  if (error) return <AppShell><Alert severity="error">{getAttemptErrorMessage(error)}</Alert></AppShell>;
  if (pageError && !question) return <AppShell><Alert severity="error">{pageError}</Alert></AppShell>;
  if (!attempt || !test || questions.length === 0) {
    return <AppShell><Alert severity="error">This attempt has no available questions.</Alert></AppShell>;
  }

  return (
    <AppShell>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5">{test.title}</Typography>
          <Typography color="text.secondary">{answeredCount}/{questions.length} answered</Typography>
          <Typography variant="body2" color="text.secondary">Attempt status: {attempt.status.replace('_', ' ')}</Typography>
        </Box>
        <Chip color={remainingSeconds < 300 ? 'error' : 'primary'} label={`${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`} aria-label="Time remaining" />
      </Stack>
      {pageError && <Alert severity="warning" sx={{ mb: 2 }}>{pageError}</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography color="text.secondary">Question {currentIndex + 1} of {questions.length}</Typography>
              <Typography variant="h6" sx={{ mt: 2 }}>{question.questionText}</Typography>
              <RadioGroup value={selected[0] ?? ''} onChange={(event) => void choose(event.target.value)} sx={{ mt: 2 }}>
                {question.options.map((option) => <FormControlLabel key={option.key} value={option.key} control={<Radio />} label={option.text} />)}
              </RadioGroup>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" spacing={1}>
                <Button disabled={currentIndex === 0} onClick={() => void goTo(currentIndex - 1)}>Previous</Button>
                <Button onClick={() => void toggleReview()}>{markedForReview[question._id] ? 'Unmark' : 'Mark review'}</Button>
                <Button disabled={currentIndex === questions.length - 1} variant="contained" onClick={() => void goTo(currentIndex + 1)}>Next</Button>
                <Button color="error" variant="outlined" onClick={() => void submit()} sx={{ ml: 'auto' }}>Submit</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography fontWeight={800} sx={{ mb: 2 }}>Question palette</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {questions.map((item, index) => (
                  <Button
                    key={item._id}
                    variant={index === currentIndex ? 'contained' : markedForReview[item._id] ? 'outlined' : answers[item._id]?.length ? 'outlined' : 'text'}
                    onClick={() => void goTo(index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AppShell>
  );
}
