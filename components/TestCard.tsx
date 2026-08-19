'use client';

import Link from 'next/link';
import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import type { Test } from '../types/test';

export function TestCard({ test }: { test: Test }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          {test.title}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {test.type === 'full_mock' ? 'Full mock test' : test.type === 'sectional' ? 'Sectional test' : 'Topic-wise test'}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
          <Chip label={`${test.totalQuestions} questions`} size="small" />
          <Chip label={`${test.totalMarks} marks`} size="small" />
          <Chip label={`${test.durationMinutes} minutes`} size="small" />
          <Chip label={test.difficulty} size="small" variant="outlined" />
        </Stack>
        <Button component={Link} href={`/tests/${test._id}`} variant="contained" sx={{ mt: 'auto', alignSelf: 'flex-start' }}>
          View test
        </Button>
      </CardContent>
    </Card>
  );
}
