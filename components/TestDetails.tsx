'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '../lib/api';
import { attemptsApi } from '../lib/api/attempts';
import { testsApi } from '../lib/api/tests';
import { examsApi } from '../lib/api/exams';
import type { Exam, Section } from '../types/exam';
import type { TestDetailResponse } from '../types/test';
import { AppShell } from './AppShell';
import { DiscoveryError, DiscoveryLoading } from './DiscoveryStates';

const QUESTION_CACHE_PREFIX = 'mock-test-attempt-questions:';

function getStartErrorMessage(error: unknown) {
  if (!(error instanceof ApiClientError)) return 'Unable to start the test. Please try again.';
  if (error.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.status === 403) return 'You are not authorized to start this test.';
  if (error.status === 404) return 'This published test is no longer available.';
  if (error.status === 409) return error.code === 'ACTIVE_ATTEMPT_EXISTS' ? 'An active attempt already exists. Please try again to resume it.' : 'This test cannot be started right now.';
  if (error.status === 400) return error.message || 'The test could not be started.';
  return 'Unable to start the test. Please try again.';
}

export function TestDetails({ testId }: { testId: string }) {
  const router = useRouter();
  const [test, setTest] = useState<TestDetailResponse | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [startError, setStartError] = useState('');

  const loadTest = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const testData = await testsApi.get(testId);
      const [examData, sectionData] = await Promise.all([examsApi.get(testData.examId), examsApi.listSections(testData.examId)]);
      setTest(testData); setExam(examData); setSections(sectionData);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load this test.'); }
    finally { setLoading(false); }
  }, [testId]);

  useEffect(() => { void loadTest(); }, [loadTest]);
  const sectionNames = useMemo(() => new Map(sections.map((section) => [section._id, section.name])), [sections]);

  async function startOrResume() {
    setStarting(true); setStartError('');
    try {
      const response = await attemptsApi.start(testId);
      try { window.sessionStorage.setItem(`${QUESTION_CACHE_PREFIX}${response.attempt._id}`, JSON.stringify(response.questions)); } catch { /* AttemptPage will show a recovery message if storage is unavailable. */ }
      router.push(`/attempt/${response.attempt._id}`);
    } catch (err) { setStartError(getStartErrorMessage(err)); setStarting(false); }
  }

  if (loading) return <AppShell><DiscoveryLoading count={4} /></AppShell>;
  if (error) return <AppShell><DiscoveryError message={error} onRetry={loadTest} /></AppShell>;
  if (!test || !exam) return <AppShell><Alert severity="error">Test not found.</Alert></AppShell>;

  return <AppShell><Stack spacing={3}>
    <Button component={Link} href={`/exams/${exam._id}`} startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'flex-start' }}>Back to {exam.name}</Button>
    <Card><CardContent sx={{ p: { xs: 3, md: 4 } }}><Stack spacing={2.5}>
      <Stack spacing={0.75}><Typography variant="h4" fontWeight={800}>{test.title}</Typography><Typography color="text.secondary">{test.type === 'full_mock' ? 'Full mock test' : test.type === 'sectional' ? 'Sectional test' : 'Topic-wise test'}</Typography></Stack>
      <Grid container spacing={1.5}><Grid size={{ xs: 6, sm: 3 }}><Chip label={`${test.totalQuestions} questions`} /></Grid><Grid size={{ xs: 6, sm: 3 }}><Chip label={`${test.totalMarks} marks`} /></Grid><Grid size={{ xs: 6, sm: 3 }}><Chip label={`${test.durationMinutes} minutes`} /></Grid><Grid size={{ xs: 6, sm: 3 }}><Chip label={test.difficulty} variant="outlined" /></Grid></Grid>
      <Divider />
      <Stack spacing={1}><Typography variant="h6" fontWeight={750}>Before you start</Typography><Typography color="text.secondary">This is a timed test. Your answers will be saved as you progress, and the server controls the attempt deadline.</Typography><Typography color="text.secondary">If you already have an active attempt, continuing will resume it instead of creating another attempt.</Typography></Stack>
      {test.sections.length > 0 && <Stack spacing={1.5}><Typography variant="h6" fontWeight={750}>Sections</Typography><Stack spacing={1}>{test.sections.map((section) => <Stack key={section.sectionId} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}><Typography fontWeight={650}>{sectionNames.get(section.sectionId) ?? 'Section'}</Typography><Typography color="text.secondary">{section.questionCount} questions · {section.marks} marks · {section.durationMinutes} min</Typography></Stack>)}</Stack></Stack>}
      {startError && <Alert severity="error">{startError}</Alert>}
      <Button variant="contained" size="large" startIcon={<PlayArrowIcon />} onClick={startOrResume} disabled={starting} aria-busy={starting} sx={{ alignSelf: 'flex-start' }}>{starting ? 'Preparing attempt...' : 'Start / Resume Test'}</Button>
    </Stack></CardContent></Card>
  </Stack></AppShell>;
}
