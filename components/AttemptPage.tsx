'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Grid, Radio, RadioGroup, FormControlLabel, Stack, Typography } from '@mui/material';
import { ApiClientError, apiClient } from '../lib/api';
import { AppShell } from './AppShell';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { resetTest, setAnswer, setCurrentIndex, setReviewState } from '../store/slices/testSlice';
import { getAttemptDeadline, useAttemptTimer } from '../hooks/useAttemptTimer';

function getAttemptErrorMessage(error: unknown) {
  if (!(error instanceof ApiClientError)) return error instanceof Error ? error.message : 'Unable to load the attempt.';
  if (error.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.status === 403) return 'You are not authorized to access this attempt.';
  if (error.status === 404) return 'This attempt could not be found.';
  if (error.status === 409 && error.code === 'ATTEMPT_EXPIRED') return 'This attempt has expired. The server has finalized it.';
  if (error.status === 400) return error.message || 'The attempt request is invalid.';
  return 'Unable to load the attempt. Please try again.';
}

function getSubmissionErrorMessage(error: unknown) {
  if (error instanceof ApiClientError && error.status === 409 && error.code === 'ATTEMPT_EXPIRED') {
    return 'This attempt has expired. The server will determine its final state.';
  }
  if (error instanceof ApiClientError && error.status === 403) return 'You are not authorized to submit this attempt.';
  if (error instanceof ApiClientError && error.status === 404) return 'This attempt is no longer available.';
  return error instanceof Error ? error.message : 'Could not submit the attempt.';
}

export function AttemptPage({ attemptId }: { attemptId: string }) {
  const router = useRouter(); const dispatch = useAppDispatch();
  const { answers, markedForReview, currentIndex } = useAppSelector(s => s.test);
  const [attempt, setAttempt] = useState<any>(); const [questions, setQuestions] = useState<any[]>([]); const [deadline, setDeadline] = useState<number | null>(null); const [error, setError] = useState('');
  const questionStartedAt = useRef<number>(Date.now()); const submitting = useRef(false);

  useEffect(() => {
    dispatch(resetTest()); let cancelled = false;
    apiClient.attempt(attemptId).then(async data => {
      const test = await apiClient.test(data.attempt.testId); if (cancelled) return;
      setAttempt(data.attempt); setQuestions(test.questions.map((q: any) => q.questionId));
      for (const answer of data.answers) { dispatch(setAnswer({ questionId: answer.questionId, options: answer.selectedOptions ?? [] })); dispatch(setReviewState({ questionId: answer.questionId, value: !!answer.markedForReview })); }
      setDeadline(getAttemptDeadline(data.attempt.startTime, test.durationMinutes)); questionStartedAt.current = Date.now();
    }).catch(e => setError(getAttemptErrorMessage(e)));
    return () => { cancelled = true; };
  }, [attemptId, dispatch]);

  const { remainingSeconds } = useAttemptTimer(deadline, !!attempt && attempt.status === 'in_progress');

  const question = questions[currentIndex]; const selected = question ? answers[question._id] ?? [] : [];
  const minutes = Math.floor(remainingSeconds / 60); const secs = remainingSeconds % 60;
  const answeredCount = useMemo(() => Object.values(answers).filter(value => value.length).length, [answers]);

  async function persistCurrentQuestion(reviewValue = question ? markedForReview[question._id] ?? false : false, selectedOptions = selected) {
    if (!question) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - questionStartedAt.current) / 1000));
    await apiClient.saveAnswer(attemptId, { questionId: question._id, selectedOptions, markedForReview: reviewValue, timeSpentSeconds: elapsed });
    questionStartedAt.current = Date.now();
  }
  async function choose(value: string) {
    if (!question) return; const next = [value]; dispatch(setAnswer({ questionId: question._id, options: next }));
    try { await persistCurrentQuestion(undefined, next); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save answer'); }
  }
  async function toggleReview() {
    if (!question) return; const next = !markedForReview[question._id]; dispatch(setReviewState({ questionId: question._id, value: next }));
    try { await persistCurrentQuestion(next); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save review state'); }
  }
  async function goTo(index: number) {
    if (!question || index === currentIndex) return dispatch(setCurrentIndex(index));
    try { await persistCurrentQuestion(); dispatch(setCurrentIndex(index)); questionStartedAt.current = Date.now(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save answer'); }
  }
  async function submit() {
    if (submitting.current) return; submitting.current = true;
    try { await persistCurrentQuestion(); await apiClient.submitAttempt(attemptId); router.push(`/attempt/${attemptId}/result`); }
    catch (e) { submitting.current = false; setError(getSubmissionErrorMessage(e)); }
  }
  if (error) return <AppShell><Alert severity="error">{error}</Alert></AppShell>;
  if (!question) return <AppShell><Typography>Loading attempt...</Typography></AppShell>;

  return <AppShell><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={{ mb: 2 }}><Box><Typography variant="h5">Mock test</Typography><Typography color="text.secondary">{answeredCount}/{questions.length} answered</Typography></Box><Chip color={remainingSeconds < 300 ? 'error' : 'primary'} label={`${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`} /></Stack><Grid container spacing={2}><Grid size={{ xs: 12, md: 8 }}><Card><CardContent sx={{ p: 3 }}><Typography color="text.secondary">Question {currentIndex + 1} of {questions.length}</Typography><Typography variant="h6" sx={{ mt: 2 }}>{question.questionText}</Typography><RadioGroup value={selected[0] ?? ''} onChange={e => choose(e.target.value)} sx={{ mt: 2 }}>{(question.options ?? []).map((option: any) => <FormControlLabel key={option.key} value={option.key} control={<Radio />} label={option.text} />)}</RadioGroup><Divider sx={{ my: 3 }} /><Stack direction="row" spacing={1}><Button disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)}>Previous</Button><Button onClick={toggleReview}>{markedForReview[question._id] ? 'Unmark' : 'Mark review'}</Button><Button disabled={currentIndex === questions.length - 1} variant="contained" onClick={() => goTo(currentIndex + 1)}>Next</Button><Button color="error" variant="outlined" onClick={submit} sx={{ ml: 'auto' }}>Submit</Button></Stack></CardContent></Card></Grid><Grid size={{ xs: 12, md: 4 }}><Card><CardContent><Typography fontWeight={800} sx={{ mb: 2 }}>Question palette</Typography><Stack direction="row" flexWrap="wrap" gap={1}>{questions.map((q, i) => <Button key={q._id} variant={i === currentIndex ? 'contained' : markedForReview[q._id] ? 'outlined' : answers[q._id]?.length ? 'outlined' : 'text'} onClick={() => goTo(i)}>{i + 1}</Button>)}</Stack></CardContent></Card></Grid></Grid></AppShell>;
}
