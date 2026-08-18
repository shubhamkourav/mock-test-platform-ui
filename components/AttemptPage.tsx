'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Grid, Radio, RadioGroup, FormControlLabel, Stack, Typography } from '@mui/material';
import { apiClient } from '../lib/api';
import { AppShell } from './AppShell';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setAnswer, setCurrentIndex, toggleReview } from '../store/slices/testSlice';

export function AttemptPage({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { answers, markedForReview, currentIndex } = useAppSelector(s => s.test);
  const [attempt, setAttempt] = useState<any>();
  const [questions, setQuestions] = useState<any[]>([]);
  const [seconds, setSeconds] = useState(3600);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.attempt(attemptId).then(data => {
      setAttempt(data.attempt);
      // Existing attempt endpoint does not return the question set, so fetch through its test.
      return apiClient.test(data.attempt.testId).then(test => setQuestions(test.questions.map((q: any) => q.questionId)));
    }).catch(e => setError(e.message));
  }, [attemptId]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return;
    const timer = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [attempt]);

  const question = questions[currentIndex];
  const selected = answers[question?._id] ?? [];
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const answeredCount = useMemo(() => Object.values(answers).filter(v => v.length).length, [answers]);

  async function choose(value: string) {
    dispatch(setAnswer({ questionId: question._id, options: [value] }));
    try {
      await apiClient.saveAnswer(attemptId, {
        questionId: question._id,
        selectedOptions: [value],
        markedForReview: !!markedForReview[question._id],
        timeSpentSeconds: 0,
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save answer'); }
  }

  async function submit() {
    try {
      await apiClient.submitAttempt(attemptId, seconds === 0);
      router.push(`/attempt/${attemptId}/result`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not submit'); }
  }

  if (error) return <AppShell><Alert severity="error">{error}</Alert></AppShell>;
  if (!question) return <AppShell><Typography>Loading attempt...</Typography></AppShell>;

  return (
    <AppShell>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Box><Typography variant="h5">Mock test</Typography><Typography color="text.secondary">{answeredCount}/{questions.length} answered</Typography></Box>
        <Chip color={seconds < 300 ? 'error' : 'primary'} label={`${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`} />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card><CardContent sx={{ p: 3 }}>
            <Typography color="text.secondary">Question {currentIndex + 1} of {questions.length}</Typography>
            <Typography variant="h6" sx={{ mt: 2 }}>{question.questionText}</Typography>
            <RadioGroup value={selected[0] ?? ''} onChange={e => choose(e.target.value)} sx={{ mt: 2 }}>
              {(question.options ?? []).map((option: any) => (
                <FormControlLabel key={option.key} value={option.key} control={<Radio />} label={option.text} />
              ))}
            </RadioGroup>
            <Divider sx={{ my: 3 }} />
            <Stack direction="row" spacing={1}>
              <Button disabled={currentIndex === 0} onClick={() => dispatch(setCurrentIndex(currentIndex - 1))}>Previous</Button>
              <Button onClick={() => dispatch(toggleReview(question._id))}>{markedForReview[question._id] ? 'Unmark' : 'Mark review'}</Button>
              <Button disabled={currentIndex === questions.length - 1} variant="contained" onClick={() => dispatch(setCurrentIndex(currentIndex + 1))}>Next</Button>
              <Button color="error" variant="outlined" onClick={submit} sx={{ ml: 'auto' }}>Submit</Button>
            </Stack>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card><CardContent>
            <Typography fontWeight={800} sx={{ mb: 2 }}>Question palette</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {questions.map((q, i) => (
                <Button key={q._id} variant={i === currentIndex ? 'contained' : answers[q._id]?.length ? 'outlined' : 'text'} onClick={() => dispatch(setCurrentIndex(i))}>
                  {i + 1}
                </Button>
              ))}
            </Stack>
          </CardContent></Card>
        </Grid>
      </Grid>
    </AppShell>
  );
}