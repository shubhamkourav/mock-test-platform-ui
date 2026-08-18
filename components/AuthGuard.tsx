'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Alert, Box, CircularProgress } from '@mui/material';
import { apiClient } from '../lib/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, setHydrated, setUser } from '../store/slices/authSlice';

const publicPaths = ['/login'];
const adminPaths = ['/admin'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, hydrated } = useAppSelector(state => state.auth);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (publicPaths.includes(pathname)) { dispatch(setHydrated()); return; }
      try {
        const currentUser = await apiClient.me();
        if (!cancelled) dispatch(setUser(currentUser));
      } catch {
        if (!cancelled) dispatch(logout());
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [dispatch, pathname]);

  useEffect(() => {
    if (!hydrated || publicPaths.includes(pathname)) return;
    if (!user) { router.replace(`/login?next=${encodeURIComponent(pathname)}`); return; }
    if (adminPaths.some(path => pathname === path || pathname.startsWith(`${path}/`)) && user.role !== 'admin') router.replace('/');
  }, [hydrated, pathname, router, user]);

  if (publicPaths.includes(pathname)) return <>{children}</>;
  if (!hydrated || !user) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  if (adminPaths.some(path => pathname === path || pathname.startsWith(`${path}/`)) && user.role !== 'admin') return <Alert severity="error">You do not have permission to view this page.</Alert>;
  return <>{children}</>;
}
