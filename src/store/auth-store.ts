import { create } from 'zustand';
import type { User, UserRole } from '../types/domain';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null, token?: string | null) => void;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
}

/**
 * In-memory mirror of the Supabase session, so components can read the signed-in
 * profile without awaiting. The authority is the database: `profiles.roles` is read
 * through `features/auth/api/session` on every app start, and nothing is persisted
 * here — a localStorage copy of `roles` would be a claim anyone could edit to
 * escalate from customer to admin.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setUser: (user, token) =>
    set((state) => ({
      user,
      token: token === undefined ? state.token : token,
      isAuthenticated: user !== null,
    })),

  logout: () => set({ user: null, token: null, isAuthenticated: false }),

  hasRole: (role) => {
    const { user } = get();
    return user ? user.roles.includes(role) : role === 'guest';
  },
}));
