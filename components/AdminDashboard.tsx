'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import { api } from '../lib/api';

export function AdminDashboard() {
  const [exams, setExams] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api<any[]>('/exams').then(setExams).catch(e => setError(e.message)); }, []);

  async function create() {
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const exam = await api<any>('/exams', {
        method: 'POST',
        body: JSON.stringify({ name, slug, category }),
      });
      setExams(v => [...v, exam]);
      setName(''); setCategory('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create exam'); }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Admin dashboard</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Card><CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Create exam</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth label="Exam name" value={name} onChange={e => setName(e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth label="Category" value={category} onChange={e => setCategory(e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 2 }}><Button fullWidth sx={{ height: '100%' }} variant="contained" onClick={create}>Create</Button></Grid>
        </Grid>
      </CardContent></Card>
      <Grid container spacing={2}>
        {exams.map(exam => <Grid key={exam._id} size={{ xs: 12, md: 4 }}><Card><CardContent><Typography fontWeight={800}>{exam.name}</Typography><Typography color="text.secondary">{exam.category}</Typography></CardContent></Card></Grid>)}
      </Grid>
    </Stack>
  );
}