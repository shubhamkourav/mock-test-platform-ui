'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { examsApi } from '../lib/api/exams';
import type { Exam } from '../types/exam';
import { AppShell } from './AppShell';
import { DiscoveryEmpty, DiscoveryError, DiscoveryLoading } from './DiscoveryStates';

export function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setExams(await examsApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load exams.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadExams(); }, [loadExams]);

  return (
    <AppShell>
      <Stack spacing={0.5} sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>Explore exams</Typography>
        <Typography color="text.secondary">Choose an exam to view its sections and available mock tests.</Typography>
      </Stack>

      {loading ? <DiscoveryLoading count={3} /> : error ? <DiscoveryError message={error} onRetry={loadExams} /> : exams.length === 0 ? (
        <DiscoveryEmpty title="No exams available" description="There are no active exams available right now." />
      ) : (
        <Grid container spacing={2}>
          {exams.map((exam) => (
            <Grid key={exam._id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" fontWeight={800} gutterBottom>{exam.name}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={exam.category} size="small" />
                  </Stack>
                  {exam.conductingBody && <Typography color="text.secondary">{exam.conductingBody}</Typography>}
                  <Button component={Link} href={`/exams/${exam._id}`} sx={{ mt: 'auto', alignSelf: 'flex-start', pt: 3 }}>View exam</Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </AppShell>
  );
}
