'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ApiClientError } from '../lib/api';
import { examsApi } from '../lib/api/exams';
import type { CreateExamInput, Exam, UpdateExamInput } from '../types/exam';
import { AppShell } from './AppShell';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function validationMessage(field: keyof CreateExamInput, value: string) {
  if (field === 'name' && (value.length < 2 || value.length > 150)) return 'Name must be 2–150 characters.';
  if (field === 'slug' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return 'Use lowercase letters, numbers, and hyphens.';
  if (field === 'category' && (value.length < 2 || value.length > 80)) return 'Category must be 2–80 characters.';
  return '';
}

function ExamForm({ exam, onSaved, onClose }: { exam: Exam | null; onSaved: (value: Exam) => void; onClose: () => void }) {
  const [form, setForm] = useState<CreateExamInput>({
    name: exam?.name ?? '',
    slug: exam?.slug ?? '',
    category: exam?.category ?? '',
    conductingBody: exam?.conductingBody ?? '',
    examPatternNotes: exam?.examPatternNotes ?? '',
    isActive: exam?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  function update<K extends keyof CreateExamInput>(field: K, value: CreateExamInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (typeof value === 'string') setErrors((current) => ({ ...current, [field]: validationMessage(field, value) }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    else next.name = validationMessage('name', form.name.trim());
    if (!form.slug.trim()) next.slug = 'Slug is required.';
    else next.slug = validationMessage('slug', form.slug.trim());
    if (!form.category.trim()) next.category = 'Category is required.';
    else next.category = validationMessage('category', form.category.trim());
    const cleaned = Object.fromEntries(Object.entries(next).filter(([, value]) => value));
    setErrors(cleaned);
    return Object.keys(cleaned).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true); setSubmitError('');
    const payload = { ...form, name: form.name.trim(), slug: form.slug.trim(), category: form.category.trim() };
    try {
      const saved = exam ? await examsApi.update(exam._id, payload as UpdateExamInput) : await examsApi.create(payload);
      onSaved(saved); onClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 403) setSubmitError("You don't have permission to manage exams and sections.");
      else setSubmitError(error instanceof Error ? error.message : 'Unable to save the exam.');
    } finally { setSaving(false); }
  }

  return <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle>{exam ? 'Edit exam' : 'Create exam'}</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        {submitError && <Alert severity="error">{submitError}</Alert>}
        <TextField label="Exam name" value={form.name} onChange={(event) => update('name', event.target.value)} error={Boolean(errors.name)} helperText={errors.name} required autoFocus />
        <TextField label="Slug" value={form.slug} onChange={(event) => update('slug', event.target.value)} error={Boolean(errors.slug)} helperText={errors.slug} required />
        {!exam && <Button size="small" onClick={() => update('slug', slugify(form.name))} sx={{ alignSelf: 'flex-start' }}>Generate slug from name</Button>}
        <TextField label="Category" value={form.category} onChange={(event) => update('category', event.target.value)} error={Boolean(errors.category)} helperText={errors.category} required />
        <TextField label="Conducting body" value={form.conductingBody} onChange={(event) => update('conductingBody', event.target.value)} />
        <TextField label="Exam pattern notes" value={form.examPatternNotes} onChange={(event) => update('examPatternNotes', event.target.value)} multiline minRows={3} inputProps={{ maxLength: 5000 }} />
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={onClose} disabled={saving}>Cancel</Button><Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save exam'}</Button></DialogActions>
  </Dialog>;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return "You don't have permission to manage exams and sections.";
    if (error.status === 404) return 'The requested exam no longer exists.';
    return error.message || 'Unable to complete the request.';
  }
  return error instanceof Error ? error.message : 'Unable to complete the request.';
}

export function AdminDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Exam | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    setLoading(true); setError('');
    try { setExams(await examsApi.list(true)); } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadExams(); }, [loadExams]);

  async function toggleActive(exam: Exam) {
    const action = exam.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${exam.name}?`)) return;
    setChangingId(exam._id); setError('');
    try {
      const updated = await examsApi.update(exam._id, { isActive: !exam.isActive });
      setExams((current) => current.map((item) => item._id === updated._id ? updated : item));
    } catch (err) { setError(errorMessage(err)); }
    finally { setChangingId(null); }
  }

  return <AppShell><Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
      <Stack spacing={0.5}><Typography variant="h4" fontWeight={800}>Exam management</Typography><Typography color="text.secondary">Create and manage exams and their active state.</Typography></Stack>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>Create exam</Button>
    </Stack>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {loading ? <Card><CardContent><Typography color="text.secondary">Loading exams...</Typography></CardContent></Card> : exams.length === 0 ? <Card><CardContent><Typography>No exams found.</Typography></CardContent></Card> : <Grid container spacing={2}>
      {exams.map((exam) => <Grid key={exam._id} size={{ xs: 12, md: 6 }}><Card sx={{ height: '100%' }}><CardContent><Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}><Stack><Typography variant="h6" fontWeight={750}>{exam.name}</Typography><Typography color="text.secondary">{exam.category}</Typography></Stack><Chip label={exam.isActive ? 'Active' : 'Inactive'} color={exam.isActive ? 'success' : 'default'} size="small" /></Stack>
        <Stack spacing={0.5}><Typography variant="body2"><strong>Slug:</strong> {exam.slug}</Typography>{exam.conductingBody && <Typography variant="body2"><strong>Conducting body:</strong> {exam.conductingBody}</Typography>}{exam.examPatternNotes && <Typography variant="body2" color="text.secondary">{exam.examPatternNotes}</Typography>}</Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button component={Link} href={`/admin/exams/${exam._id}`} variant="contained" startIcon={<OpenInNewIcon />}>Details & sections</Button>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => { setEditing(exam); setFormOpen(true); }}>Edit</Button>
          <Button variant="text" onClick={() => void toggleActive(exam)} disabled={changingId === exam._id}>{changingId === exam._id ? 'Updating...' : exam.isActive ? 'Deactivate' : 'Activate'}</Button>
        </Stack>
      </Stack></CardContent></Card></Grid>)}
    </Grid>}
    {formOpen && <ExamForm exam={editing} onSaved={(saved) => setExams((current) => editing ? current.map((item) => item._id === saved._id ? saved : item) : [saved, ...current])} onClose={() => setFormOpen(false)} />}
  </Stack></AppShell>;
}
