'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { apiClient } from '../lib/api';
import { AppShell } from './AppShell';

export function TestDetails({ testId }: { testId: string }) {
  const router = useRouter();
  const [test, setTest] = useState<any>();
  const [error, setError] = useState('');

  useEffect(() => { apiClient.test(testId).then(setTest).catch(e => setError(e.message)); }, [testId]);

  async function start() {
    try {
      const result = await apiClient.startAttempt(testId);
      router.push(`/attempt/${result.attempt._id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start test'); }
  }

  if (error) return <AppShell><Alert severity="error">{error}</Alert></AppShell>;
  if (!test) return <AppShell><Typography>Loading test...</Typography></AppShell>;

  return (
    <AppShell>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4">{test.title}</Typography>
          <Stack direction="row" spacing={1} sx={{ my: 2 }}>
            <Chip label={`${test.totalQuestions} questions`} />
            <Chip label={`${test.totalMarks} marks`} />
            <Chip label={`${test.durationMinutes} minutes`} />
            <Chip label={test.difficulty} />
          </Stack>
          <Typography color="text.secondary">Start a fresh timed attempt. Answers are saved as you progress.</Typography>
          <Button variant="contained" size="large" onClick={start} sx={{ mt: 3 }}>Start test</Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}