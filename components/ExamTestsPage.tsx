'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardContent, Chip, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { apiClient } from '../lib/api';
import { AppShell } from './AppShell';

export function ExamTestsPage({ examId }: { examId: string }) {
  const [tests, setTests] = useState<any[]>([]); const [error, setError] = useState('');
  useEffect(() => { apiClient.tests(examId).then(setTests).catch(e => setError(e.message)); }, [examId]);
  return <AppShell><Typography variant="h4" sx={{ mb: 1 }}>Available mock tests</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Select a published test for this exam.</Typography>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Grid container spacing={2}>{tests.length === 0 && !error ? [1,2].map(i => <Grid key={i} size={{ xs: 12, md: 6 }}><Skeleton variant="rounded" height={180} /></Grid>) : null}{tests.map(test => <Grid key={test._id} size={{ xs: 12, md: 6 }}><Card sx={{ height: '100%' }}><CardContent><Typography variant="h6" fontWeight={800}>{test.title}</Typography><Stack direction="row" spacing={1} sx={{ my: 2 }}><Chip label={`${test.totalQuestions} questions`} /><Chip label={`${test.totalMarks} marks`} /><Chip label={`${test.durationMinutes} minutes`} /></Stack><Button component={Link} href={`/tests/${test._id}`} variant="contained">View test</Button></CardContent></Card></Grid>)}</Grid></AppShell>;
}
