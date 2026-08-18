'use client';

import { Provider } from 'react-redux';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { store } from '../store';
import { AuthGuard } from './AuthGuard';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#4f46e5' }, secondary: { main: '#0f766e' }, background: { default: '#f6f7fb', paper: '#ffffff' } },
  typography: { fontFamily: 'Inter, Arial, sans-serif', h4: { fontWeight: 800 }, h5: { fontWeight: 800 } },
  shape: { borderRadius: 12 },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return <Provider store={store}><ThemeProvider theme={theme}><CssBaseline /><AuthGuard>{children}</AuthGuard></ThemeProvider></Provider>;
}
