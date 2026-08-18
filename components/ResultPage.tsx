'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, Grid, Stack, Typography, Button, LinearProgress } from '@mui/material';
import { apiClient } from '../lib/api';
import { AppShell } from './AppShell';

export function ResultPage({ attemptId }: { attemptId: string }) {
  const [result, setResult] = useState<any>();
  useEffect(() => { apiClient.result(attemptId).then(setResult); }, [attemptId]);

  if (!result) return <AppShell><Typography>Loading result...</Typography></AppShell>;

  const accuracy = result.accuracy ?? 0;
  return (
    <AppShell>
      <Typography variant="h4" sx={{ mb: 3 }}>Test result</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}><Card><CardContent><Typography color="text.secondary">Score</Typography><Typography variant="h4">{result.attempt.totalScore}</Typography></CardContent></Card></Grid>
        <Grid size={{ xs: 12, md: 3 }}><Card><CardContent><Typography color="text.secondary">Correct</Typography><Typography variant="h4">{result.attempt.correctCount}</Typography></CardContent></Card></Grid>
        <Grid size={{ xs: 12, md: 3 }}><Card><CardContent><Typography color="text.secondary">Incorrect</Typography><Typography variant="h4">{result.attempt.incorrectCount}</Typography></CardContent></Card></Grid>
        <Grid size={{ xs: 12, md: 3 }}><Card><CardContent><Typography color="text.secondary">Accuracy</Typography><Typography variant="h4">{accuracy}%</Typography></CardContent></Card></Grid>
      </Grid>
      <Card sx={{ mt: 2 }}><CardContent>
        <Typography variant="h6">Accuracy</Typography>
        <LinearProgress variant="determinate" value={accuracy} sx={{ mt: 2, height: 10, borderRadius: 5 }} />
      </CardContent></Card>
      <Card sx={{ mt: 2 }}><CardContent>
        <Typography variant="h6">Topic performance</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {result.topics.map((topic: any) => (
            <div key={topic.topic}>
              <Stack direction="row" justifyContent="space-between"><Typography>{topic.topic}</Typography><Typography>{topic.accuracy}%</Typography></Stack>
              <LinearProgress variant="determinate" value={topic.accuracy} />
            </div>
          ))}
        </Stack>
      </CardContent></Card>
      <Button component={Link} href="/exams" variant="contained" sx={{ mt: 3 }}>Back to exams</Button>
    </AppShell>
  );
}