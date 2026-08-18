import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type User = { id: string; name: string; email: string; role: 'student' | 'admin' };
type AuthState = { accessToken: string | null; refreshToken: string | null; user: User | null; hydrated: boolean };
const initialState: AuthState = { accessToken: null, refreshToken: null, user: null, hydrated: false };

const slice = createSlice({
  name: 'auth', initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; user: User }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.hydrated = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
    },
    setUser: (state, action: PayloadAction<User>) => { state.user = action.payload; state.hydrated = true; },
    setHydrated: state => { state.hydrated = true; },
    logout: state => {
      state.accessToken = null; state.refreshToken = null; state.user = null; state.hydrated = true;
      if (typeof window !== 'undefined') { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); }
    },
  },
});
export const { setSession, setUser, setHydrated, logout } = slice.actions;
export default slice.reducer;
