'use client';

import Link from 'next/link';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';

export function AppShell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <Typography component={Link} href="/" variant="h6" sx={{ color: '#fff', textDecoration: 'none', fontWeight: 900, flex: 1 }}>
            MockPrep
          </Typography>
          <Button component={Link} href="/exams" color="inherit">Exams</Button>
          <Button component={Link} href="/admin" color="inherit">Admin</Button>
          <Button onClick={() => dispatch(logout())} color="inherit">Logout</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>{children}</Container>
    </>
  );
}