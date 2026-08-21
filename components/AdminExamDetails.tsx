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
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { ApiClientError } from '../lib/api';
import { examsApi } from '../lib/api/exams';
import type { CreateSectionInput, Exam, Section, UpdateSectionInput } from '../types/exam';
import { AppShell } from './AppShell';

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return "You don't have permission to manage exams and sections.";
    if (error.status === 404) return 'The requested resource no longer exists.';
    return error.message || 'Unable to complete the request.';
  }
  return error instanceof Error ? error.message : 'Unable to complete the request.';
}

type SectionFormValues = {
  stage: string;
  name: string;
  slug: string;
  subjectTag: string;
  questionCount: number;
  timeMinutes: number;
  maxMarks: number;
  negativeMarking: number;
  order: number;
  isActive: boolean;
};

function SectionForm({ examId, section, onSaved, onClose }: { examId: string; section: Section | null; onSaved: (value: Section) => void; onClose: () => void }) {
  const [form, setForm] = useState<SectionFormValues>({
    stage: section?.stage ?? 'prelims', name: section?.name ?? '', slug: section?.slug ?? '', subjectTag: section?.subjectTag ?? '',
    questionCount: section?.questionCount ?? 1, timeMinutes: section?.timeMinutes ?? 1, maxMarks: section?.maxMarks ?? 0,
    negativeMarking: section?.negativeMarking ?? 0, order: section?.order ?? 1, isActive: section?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update<K extends keyof SectionFormValues>(field: K, value: SectionFormValues[K]) { setForm((current) => ({ ...current, [field]: value })); }

  function validate() {
    if (!form.name.trim() || !form.slug.trim() || !form.subjectTag.trim()) { setError('Name, slug, and subject tag are required.'); return false; }
    if (!Number.isInteger(form.questionCount) || form.questionCount < 1) { setError('Question count must be a positive integer.'); return false; }
    if (!Number.isInteger(form.timeMinutes) || form.timeMinutes < 1) { setError('Time must be a positive integer.'); return false; }
    if (form.maxMarks < 0 || form.negativeMarking < 0) { setError('Marks and negative marking cannot be negative.'); return false; }
    if (!Number.isInteger(form.order) || form.order < 1) { setError('Order must be a positive integer.'); return false; }
    setError(''); return true;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true); setError('');
    const payload: CreateSectionInput = form;
    try {
      const saved = section ? await examsApi.updateSection(section._id, payload as UpdateSectionInput) : await examsApi.createSection(examId, payload);
      onSaved(saved); onClose();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSaving(false); }
  }

  return <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle>{section ? 'Edit section' : 'Create section'}</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Stage" value={form.stage} onChange={(e) => update('stage', e.target.value)} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Subject tag" value={form.subjectTag} onChange={(e) => update('subjectTag', e.target.value)} required /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Name" value={form.name} onChange={(e) => update('name', e.target.value)} required /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Slug" value={form.slug} onChange={(e) => update('slug', e.target.value)} required /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth type="number" label="Questions" value={form.questionCount} onChange={(e) => update('questionCount', Number(e.target.value))} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth type="number" label="Time (min)" value={form.timeMinutes} onChange={(e) => update('timeMinutes', Number(e.target.value))} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth type="number" label="Max marks" value={form.maxMarks} onChange={(e) => update('maxMarks', Number(e.target.value))} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth type="number" label="Negative marking" value={form.negativeMarking} onChange={(e) => update('negativeMarking', Number(e.target.value))} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label="Order" value={form.order} onChange={(e) => update('order', Number(e.target.value))} /></Grid>
        </Grid>
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={onClose} disabled={saving}>Cancel</Button><Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save section'}</Button></DialogActions>
  </Dialog>;
}

function ConfirmDialog({ title, resourceName, open, loading, onCancel, onConfirm }: { title: string; resourceName: string; open: boolean; loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent><Typography>Are you sure you want to deactivate <strong>{resourceName}</strong>? The server will validate whether this action is allowed.</Typography></DialogContent>
    <DialogActions><Button onClick={onCancel} disabled={loading}>Cancel</Button><Button color="error" variant="contained" onClick={onConfirm} disabled={loading}>{loading ? 'Deactivating...' : 'Deactivate'}</Button></DialogActions>
  </Dialog>;
}

export function AdminExamDetails({ examId }: { examId: string }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [confirmSection, setConfirmSection] = useState<Section | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [examData, sectionData] = await Promise.all([examsApi.get(examId), examsApi.listSections(examId, true)]);
      setExam(examData); setSections([...sectionData].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }, [examId]);

  useEffect(() => { void load(); }, [load]);

  async function toggleExam() {
    if (!exam) return;
    if (exam.isActive && !window.confirm(`Are you sure you want to deactivate ${exam.name}?`)) return;
    setChangingId(exam._id); setError('');
    try { setExam(await examsApi.update(exam._id, { isActive: !exam.isActive })); }
    catch (err) { setError(apiErrorMessage(err)); }
    finally { setChangingId(null); }
  }

  async function toggleSection(section: Section) {
    if (section.isActive) { setConfirmSection(section); return; }
    setChangingId(section._id); setError('');
    try { const updated = await examsApi.updateSection(section._id, { isActive: true }); setSections((current) => current.map((item) => item._id === updated._id ? updated : item).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))); }
    catch (err) { setError(apiErrorMessage(err)); }
    finally { setChangingId(null); }
  }

  async function deactivateSection() {
    if (!confirmSection) return;
    setChangingId(confirmSection._id); setError('');
    try { await examsApi.deleteSection(confirmSection._id); setSections((current) => current.map((item) => item._id === confirmSection._id ? { ...item, isActive: false } : item)); setConfirmSection(null); }
    catch (err) { setError(apiErrorMessage(err)); }
    finally { setChangingId(null); }
  }

  async function moveSection(section: Section, direction: -1 | 1) {
    const index = sections.findIndex((item) => item._id === section._id);
    const target = sections[index + direction];
    if (!target) return;
    setChangingId(section._id); setError('');
    try {
      const [updatedSection, updatedTarget] = await Promise.all([
        examsApi.updateSection(section._id, { order: target.order }),
        examsApi.updateSection(target._id, { order: section.order }),
      ]);
      setSections((current) => current.map((item) => item._id === updatedSection._id ? updatedSection : item._id === updatedTarget._id ? updatedTarget : item).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setChangingId(null); }
  }

  if (loading) return <AppShell><Card><CardContent><Typography>Loading exam...</Typography></CardContent></Card></AppShell>;
  if (error && !exam) return <AppShell><Stack spacing={2}><Alert severity="error">{error}</Alert><Button component={Link} href="/admin" startIcon={<ArrowBackIcon />}>Back to exams</Button></Stack></AppShell>;
  if (!exam) return <AppShell><Alert severity="error">Exam not found.</Alert></AppShell>;

  return <AppShell><Stack spacing={3}>
    <Button component={Link} href="/admin" startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'flex-start' }}>Back to exams</Button>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Card><CardContent><Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}><Stack spacing={0.5}><Typography variant="h4" fontWeight={800}>{exam.name}</Typography><Typography color="text.secondary">{exam.category} · {exam.slug}</Typography></Stack><Chip label={exam.isActive ? 'Active' : 'Inactive'} color={exam.isActive ? 'success' : 'default'} /></Stack>
      <Grid container spacing={2}><Grid size={{ xs: 12, sm: 6 }}><Typography variant="body2"><strong>Conducting body:</strong> {exam.conductingBody || '—'}</Typography></Grid><Grid size={{ xs: 12, sm: 6 }}><Typography variant="body2"><strong>Slug:</strong> {exam.slug}</Typography></Grid></Grid>
      {exam.examPatternNotes && <Typography color="text.secondary">{exam.examPatternNotes}</Typography>}
      <Stack direction="row" spacing={1}><Button variant="outlined" onClick={toggleExam} disabled={changingId === exam._id}>{changingId === exam._id ? 'Updating...' : exam.isActive ? 'Deactivate exam' : 'Activate exam'}</Button></Stack>
    </Stack></CardContent></Card>

    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}><Stack><Typography variant="h5" fontWeight={800}>Sections</Typography><Typography color="text.secondary">Manage sections and their order for this exam.</Typography></Stack><Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingSection(null); setSectionFormOpen(true); }}>Create section</Button></Stack>
    {sections.length === 0 ? <Card><CardContent><Typography>No sections found.</Typography></CardContent></Card> : <Stack spacing={2}>{sections.map((section, index) => <Card key={section._id}><CardContent><Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}><Stack><Typography variant="h6" fontWeight={750}>{section.name}</Typography><Typography color="text.secondary">{section.stage} · {section.subjectTag} · {section.slug}</Typography></Stack><Chip label={section.isActive ? 'Active' : 'Inactive'} color={section.isActive ? 'success' : 'default'} size="small" /></Stack>
      <Grid container spacing={1.5}>{[['Questions', section.questionCount], ['Time', `${section.timeMinutes} min`], ['Max marks', section.maxMarks], ['Negative marking', section.negativeMarking], ['Order', section.order]].map(([label, value]) => <Grid key={String(label)} size={{ xs: 6, sm: 2.4 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={650}>{value}</Typography></Grid>)}</Grid>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => { setEditingSection(section); setSectionFormOpen(true); }}>Edit</Button>
        <Button variant="text" onClick={() => void toggleSection(section)} disabled={changingId === section._id}>{changingId === section._id ? 'Updating...' : section.isActive ? 'Deactivate' : 'Activate'}</Button>
        <IconButton aria-label={`Move ${section.name} up`} onClick={() => void moveSection(section, -1)} disabled={index === 0 || changingId === section._id} size="small"><ArrowUpwardIcon /></IconButton>
        <IconButton aria-label={`Move ${section.name} down`} onClick={() => void moveSection(section, 1)} disabled={index === sections.length - 1 || changingId === section._id} size="small"><ArrowDownwardIcon /></IconButton>
      </Stack>
    </Stack></CardContent></Card>)}</Stack>}

    {sectionFormOpen && <SectionForm examId={exam._id} section={editingSection} onSaved={(saved) => setSections((current) => [...current.filter((item) => item._id !== saved._id), saved].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)))} onClose={() => setSectionFormOpen(false)} />}
    <ConfirmDialog title="Deactivate section" resourceName={confirmSection?.name ?? ''} open={Boolean(confirmSection)} loading={changingId === confirmSection?._id} onCancel={() => setConfirmSection(null)} onConfirm={() => void deactivateSection()} />
  </Stack></AppShell>;
}
