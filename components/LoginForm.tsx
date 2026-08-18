'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { apiClient } from '../lib/api';
import { useAppDispatch } from '../store/hooks';
import { setSession } from '../store/slices/authSlice';

export function LoginForm() {
  const router = useRouter(); const dispatch = useAppDispatch();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const session = await apiClient.login({ email, password }); dispatch(setSession(session));
      const next = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null;
      router.replace(next || '/');
    } catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
  }
  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}><Card sx={{ width: '100%', maxWidth: 440 }}><CardContent sx={{ p: 4 }}><Typography variant="h5">Sign in to MockPrep</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Continue your preparation.</Typography><form onSubmit={submit}><Stack spacing={2}>{error && <Alert severity="error">{error}</Alert>}<TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth required /><TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth required /><Button type="submit" variant="contained" size="large">Sign in</Button></Stack></form></CardContent></Card></Box>;
}
