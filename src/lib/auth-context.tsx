import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as sessionApi from '../features/auth/api/session';
import type { SignUpResult } from '../features/auth/api/session';
import { hasAnyRole, hasPermission } from '../features/auth/rbac';
import type { DemoRoleKey } from '../lib/demo-accounts';
import type { User, UserRole } from '../types/domain';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Resolves with the profile the backend authorized, or throws with Supabase's message. */
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  /** One-click persona sign-in; these are real seeded accounts, not a client-side shortcut. */
  signInAsDemo: (roleKey: DemoRoleKey) => Promise<User>;
  /** Redirects to the provider; the app resumes with the session it hands back. */
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  /**
   * The single place a session becomes app state. Per-user carts and wishlists are
   * re-keyed here so a sign-in can never inherit the previous user's buckets.
   */
  const applySession = (user: User | null, next: Session | null) => {
    setSession(next);
    if (user) {
      const prevUser = useAuthStore.getState().user;
      const isAlreadyActiveUser = prevUser?.id === user.id;

      setUser(user, next?.access_token ?? null);

      if (!isAlreadyActiveUser) {
        useCartStore.getState().initializeForUser(user.id);
        useWishlistStore.getState().loadWishlistForUser(user.id);
      }
    } else {
      logout();
      useCartStore.getState().initializeForUser(null);
      useWishlistStore.getState().initializeForGuest();
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    // Supabase replays INITIAL_SESSION on subscribe, so the persisted session is
    // restored - and its roles re-read under RLS - without a second round-trip.
    const unsubscribe = sessionApi.onAuthStateChange((user, next) => {
      if (active) applySession(user, next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user, session: next } = await sessionApi.signIn(email, password);
    applySession(user, next);
    return user;
  };

  const signUp = async (name: string, email: string, password: string) => {
    const result = await sessionApi.signUp(name, email, password);
    if (result.user) applySession(result.user, result.session);
    return result;
  };

  const signInAsDemo = async (roleKey: DemoRoleKey) => {
    if (!import.meta.env.DEV) {
      throw new Error('Demo sign-in is disabled in production builds.');
    }
    const { DEMO_ACCOUNTS, DEMO_PASSWORD } = await import('../lib/demo-accounts');
    const persona = DEMO_ACCOUNTS[roleKey];
    if (!persona) throw new Error(`Unknown demo persona: ${roleKey}`);
    return signIn(persona.email, DEMO_PASSWORD);
  };

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    await sessionApi.signInWithOAuth(provider);
  };

  const signOut = async () => {
    await sessionApi.signOut();
    applySession(null, null);
  };

  const hasRole = (role: UserRole) => {
    const { user } = useAuthStore.getState();
    return user ? user.roles.includes(role) : role === 'guest';
  };

  const refreshUser = async () => {
    const { user: profile, session: next } = await sessionApi.refreshProfile();
    applySession(profile, next);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signInAsDemo, signInWithProvider, signOut, hasRole, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRoleAccess(requiredRoles: UserRole[]) {
  const { user } = useAuth();
  return user !== null && hasAnyRole(user.roles, requiredRoles);
}

export function usePermission(permission: string) {
  const { user } = useAuth();
  if (!user) return false;
  return hasPermission(user.roles, permission);
}
