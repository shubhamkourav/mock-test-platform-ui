'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardContent, Grid, Skeleton, Typography } from '@mui/material';
import { apiClient } from '../lib/api';
import { AppShell } from './AppShell';

type Exam = { _id: string; name: string; category: string; conductingBody?: string };
export function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]); const [error, setError] = useState('');
  useEffect(() => { apiClient.exams().then(setExams).catch(e => setError(e.message)); }, []);
  return <AppShell><Typography variant="h4" sx={{ mb: 1 }}>Explore exams</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Choose an exam to view available mock tests.</Typography>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Grid container spacing={2}>{exams.length === 0 && !error ? [1,2,3].map(i => <Grid key={i} size={{ xs: 12, md: 4 }}><Skeleton variant="rounded" height={180} /></Grid>) : null}{exams.map(exam => <Grid key={exam._id} size={{ xs: 12, md: 4 }}><Card sx={{ height: '100%' }}><CardContent><Typography variant="h6" fontWeight={800}>{exam.name}</Typography><Typography color="text.secondary">{exam.category}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{exam.conductingBody}</Typography><Button component={Link} href={`/exams/${exam._id}`} sx={{ mt: 2 }}>View tests</Button></CardContent></Card></Grid>)}</Grid></AppShell>;
}
