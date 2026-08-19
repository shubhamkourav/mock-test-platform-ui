'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { examsApi } from '../lib/api/exams';
import { testsApi } from '../lib/api/tests';
import type { Exam, Section } from '../types/exam';
import type { Test } from '../types/test';
import { AppShell } from './AppShell';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from './DiscoveryStates';
import { TestCard } from './TestCard';

export function ExamTestsPage({ examId }: { examId: string }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadExam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [examData, sectionData, testData] = await Promise.all([
        examsApi.get(examId),
        examsApi.listSections(examId),
        testsApi.list(examId),
      ]);
      setExam(examData);
      setSections(sectionData);
      setTests(testData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this exam.');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => { void loadExam(); }, [loadExam]);

  const sectionNames = useMemo(() => new Map(sections.map((section) => [section._id, section.name])), [sections]);

  if (loading) {
    return <AppShell><DiscoveryLoading count={4} /></AppShell>;
  }

  if (error) {
    return <AppShell><DiscoveryError message={error} onRetry={loadExam} /></AppShell>;
  }

  if (!exam) {
    return <AppShell><Alert severity="error">Exam not found.</Alert></AppShell>;
  }

  return (
    <AppShell>
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Button component={Link} href="/exams" startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'flex-start' }}>Back to exams</Button>
        <Stack spacing={0.5}>
          <Typography variant="h4" fontWeight={800}>{exam.name}</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={exam.category} size="small" />
            {exam.conductingBody && <Chip label={exam.conductingBody} size="small" variant="outlined" />}
          </Stack>
        </Stack>
        {exam.examPatternNotes && <Typography color="text.secondary">{exam.examPatternNotes}</Typography>}
      </Stack>

      <Stack spacing={2} sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={750}>Sections</Typography>
        {sections.length === 0 ? (
          <DiscoveryEmpty title="No sections available" description="Section information is not available for this exam yet." />
        ) : (
          <Grid container spacing={2}>
            {sections.map((section) => (
              <Grid key={section._id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography fontWeight={750}>{section.name}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>{section.subjectTag}</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                      <Chip label={`${section.questionCount} questions`} size="small" />
                      <Chip label={`${section.timeMinutes} min`} size="small" />
                      <Chip label={`${section.maxMarks} marks`} size="small" />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

      <Divider sx={{ mb: 4 }} />
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={750}>Available tests</Typography>
          <Typography color="text.secondary">Only tests currently available to students are shown.</Typography>
        </Stack>
        {tests.length === 0 ? (
          <DiscoveryEmpty title="No tests available" description="There are no published mock tests available for this exam right now." />
        ) : (
          <Grid container spacing={2}>
            {tests.map((test) => (
              <Grid key={test._id} size={{ xs: 12, md: 6 }}>
                <Stack spacing={1} sx={{ height: '100%' }}>
                  <TestCard test={test} />
                  {test.sections.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {test.sections.map((section) => `${sectionNames.get(section.sectionId) ?? 'Section'} · ${section.questionCount} questions`).join('  •  ')}
                    </Typography>
                  )}
                </Stack>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </AppShell>
  );
}
