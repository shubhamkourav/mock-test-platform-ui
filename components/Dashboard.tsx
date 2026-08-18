'use client';

import Link from 'next/link';
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { AppShell } from './AppShell';

const cards = [
  ['Target Exams', 'Choose your exam and build a focused preparation plan.'],
  ['Mock Tests', 'Practice with timed mocks and sectional tests.'],
  ['Performance', 'Track accuracy, attempts, speed and weak topics.'],
];

export function Dashboard() {
  return (
    <AppShell>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" gutterBottom>Prepare smarter. Test better.</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
          One platform for government and private exam preparation, realistic mock tests and actionable performance analytics.
        </Typography>
        <Button component={Link} href="/exams" variant="contained" size="large" sx={{ mt: 3 }}>
          Explore exams
        </Button>
      </Box>
      <Grid container spacing={2}>
        {cards.map(([title, text]) => (
          <Grid key={title} size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800}>{title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>{text}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 3 }}>
        <Card sx={{ flex: 1 }}><CardContent><Typography color="text.secondary">Tests attempted</Typography><Typography variant="h4">0</Typography></CardContent></Card>
        <Card sx={{ flex: 1 }}><CardContent><Typography color="text.secondary">Average accuracy</Typography><Typography variant="h4">—</Typography></CardContent></Card>
        <Card sx={{ flex: 1 }}><CardContent><Typography color="text.secondary">Best score</Typography><Typography variant="h4">—</Typography></CardContent></Card>
      </Stack>
    </AppShell>
  );
}