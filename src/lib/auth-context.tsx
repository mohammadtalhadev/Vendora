import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as sessionApi from '../features/auth/api/session';
import type { SignUpResult } from '../features/auth/api/session';
import { clearStepUp, getAalLevel, isMfaExempt, listTotpFactors, type AalLevel } from '../features/auth/api/mfa';
import { hasAnyRole, hasPermission } from '../features/auth/rbac';
import type { DemoRoleKey } from '../lib/demo-accounts';
import type { User, UserRole } from '../types/domain';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import { queryClient } from './query-client';

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
  /**
   * Two-factor state (Batch 64): the session's current assurance level, whether
   * the account holds a verified TOTP factor, and whether that picture has been
   * read yet. Only staff surfaces consult it — a customer with no factor is
   * simply aal1 with `hasVerifiedTotp: false` and is never MFA-blocked.
   */
  aal: AalLevel;
  hasVerifiedTotp: boolean;
  mfaLoaded: boolean;
  refreshAal: () => Promise<void>;
  /**
   * TEMPORARY testing exemption (Batch 86) — remove with the mfa_exemptions
   * table. True while the signed-in account holds an exemption row; the
   * staff portal, the AAL2 console gate and the step-up dialog all treat it
   * as satisfying the second factor. Loaded with the rest of the two-factor
   * picture in refreshAal, so `mfaLoaded` implies this is known too. The
   * check fails closed (see api/mfa): false is the default everywhere.
   */
  mfaExempt: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [aal, setAal] = useState<AalLevel>('aal1');
  const [hasVerifiedTotp, setHasVerifiedTotp] = useState(false);
  const [mfaLoaded, setMfaLoaded] = useState(false);
  // TEMPORARY testing exemption (Batch 86) — remove with the mfa_exemptions table.
  const [mfaExempt, setMfaExempt] = useState(false);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  /**
   * Re-reads the two-factor picture for whoever is signed in. The MFA API
   * layer is fully defensive (a client without the surface reads as aal1 /
   * no factor), so this can run on every session application — including the
   * MFA_CHALLENGE_VERIFIED event, which is how a completed portal challenge
   * lifts the context to aal2 without a page reload.
   */
  const refreshAal = useCallback(async () => {
    if (!useAuthStore.getState().user) {
      setAal('aal1');
      setHasVerifiedTotp(false);
      setMfaExempt(false);
      setMfaLoaded(true);
      return;
    }
    const [level, lists, exempt] = await Promise.all([
      getAalLevel(),
      listTotpFactors(),
      // TEMPORARY testing exemption (Batch 86) — remove with the mfa_exemptions table.
      isMfaExempt(),
    ]);
    setAal(level);
    setHasVerifiedTotp(Boolean(lists?.verified.length));
    setMfaExempt(exempt);
    setMfaLoaded(true);
  }, []);

  /**
   * The single place a session becomes app state. Per-user carts and wishlists are
   * re-keyed here so a sign-in can never inherit the previous user's buckets.
   */
  const applySession = (user: User | null, next: Session | null) => {
    if (!user && next) {
      // A live session whose profile could not be resolved (see the listener
      // contract in session.ts). This is not a sign-out and not a wrong role:
      // keep the profile already held, and if none is held yet keep `loading`
      // up so guards wait instead of redirecting and surfaces keep their
      // previous state instead of flashing a signed-out one.
      setSession(next);
      if (useAuthStore.getState().user) setLoading(false);
      return;
    }
    setSession(next);
    if (user) {
      const prevUser = useAuthStore.getState().user;
      const isAlreadyActiveUser = prevUser?.id === user.id;

      setUser(user, next?.access_token ?? null);

      if (!isAlreadyActiveUser) {
        useCartStore.getState().initializeForUser(user.id);
        useWishlistStore.getState().loadWishlistForUser(user.id);
      }
      void refreshAal();
    } else {
      logout();
      useCartStore.getState().initializeForUser(null);
      useWishlistStore.getState().initializeForGuest();
      setAal('aal1');
      setHasVerifiedTotp(false);
      setMfaExempt(false);
      setMfaLoaded(false);
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
    const departingUserId = useAuthStore.getState().user?.id ?? null;
    await sessionApi.signOut();
    // The step-up freshness proof belongs to the departing session; the next
    // sign-in must earn its own (Batch 64).
    clearStepUp();
    applySession(null, null);
    // Logout hygiene (FE-SEC F3): the query cache holds the departing
    // account's orders, addresses and staff lists in memory, and the cart /
    // wishlist localStorage entries are that account's cached server state.
    // Both stay behind on a shared browser unless they are cleared here.
    // Only the departing user's own keys go — guest buckets and device
    // preferences (theme, currency) are not the account's data.
    queryClient.clear();
    if (departingUserId && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`vd:v1:cart:${departingUserId}`);
        localStorage.removeItem(`vd:v1:wishlist:${departingUserId}`);
      } catch {
        // Storage unavailable (private mode quotas etc.) — the in-memory
        // reset above still stands; there is nothing further to report.
      }
    }
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
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInAsDemo,
        signInWithProvider,
        signOut,
        hasRole,
        refreshUser,
        aal,
        hasVerifiedTotp,
        mfaLoaded,
        refreshAal,
        mfaExempt,
      }}
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

/**
 * TEMPORARY testing exemption (Batch 86) — remove with the mfa_exemptions
 * table. The exemption flag for consumers that cannot assume an AuthProvider
 * (the step-up hook is unit-tested bare): outside a provider the answer is
 * false, which is the fail-closed default the whole exemption design wants.
 */
export function useMfaExempt(): boolean {
  const context = useContext(AuthContext);
  return context?.mfaExempt ?? false;
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
