'use client';

import Link from 'next/link';
import { AppBar, Button, Container, Toolbar, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { apiClient } from '../lib/api';
import { logout } from '../store/slices/authSlice';

export function AppShell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  async function signOut() {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    try { if (refreshToken) await apiClient.logout(refreshToken); } finally { dispatch(logout()); }
  }
  return <><AppBar position="sticky" elevation={0}><Toolbar><Typography component={Link} href="/" variant="h6" sx={{ color: '#fff', textDecoration: 'none', fontWeight: 900, flex: 1 }}>MockPrep</Typography><Button component={Link} href="/exams" color="inherit">Exams</Button>{user?.role === 'admin' && <Button component={Link} href="/admin" color="inherit">Admin</Button>}<Button onClick={signOut} color="inherit">Logout</Button></Toolbar></AppBar><Container maxWidth="lg" sx={{ py: 4 }}>{children}</Container></>;
}
