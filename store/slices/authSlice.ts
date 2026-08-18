import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type User = { id: string; name: string; email: string; role: 'student' | 'admin' };
type AuthState = { accessToken: string | null; refreshToken: string | null; user: User | null };

const initialState: AuthState = { accessToken: null, refreshToken: null, user: null };

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; user?: User }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      if (action.payload.user) state.user = action.payload.user;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
    },
    logout: state => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    },
  },
});

export const { setSession, logout } = slice.actions;
export default slice.reducer;