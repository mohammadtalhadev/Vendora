import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { friendlyErrorText } from '../lib/friendly-error';
import { safeRedirect } from '../lib/safe-redirect';
import { useThemePreference } from '../lib/theme';
import { isMfaExempt, listTotpFactors, markStepUpVerified } from '../features/auth/api/mfa';
import { TotpChallengeForm } from '../features/auth/components/TotpChallengeForm';
import { TotpEnrollForm } from '../features/auth/components/TotpEnrollForm';
import type { User } from '../types/domain';
import { Button } from '../components/ui/button';

/**
 * AdminLoginPage — the staff-only sign-in at /admin/login.
 *
 * Deliberately separate from the customer /login: the admin workspace's route
 * guard sends unauthenticated visitors here, and this page enforces the staff
 * boundary itself. A sign-in only "counts" when the loaded profile carries a
 * staff role — admins continue to the admin console (or the /admin page they
 * were headed to), support staff to the support console. Any other account is
 * signed straight back out and told, in plain language, that it has no staff
 * access; it never silently becomes a buyer session inside the staff door.
 *
 * Batch 64 adds the second factor to that boundary. Passing the password is
 * only step one: before any destination is navigated to, a staff session must
 * also prove a TOTP factor. A verified factor is challenged; an account with
 * no factor is walked through enrollment right here — forced, but never a
 * dead end, so no staff account can lock itself out by not having set one up
 * yet. Only once the session reaches aal2 does this page hand the user to
 * their console (the consoles re-check that level on every route).
 */
/** The console a staff role belongs to; null means "not staff at all". */
function staffHome(roles: string[]): '/admin' | '/support' | null {
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('support')) return '/support';
  return null;
}

/**
 * Only ever continue to an /admin path the guard named — never back to this
 * page, and never to an arbitrary URL. The target first passes the shared
 * safeRedirect (Batch 63): anything that is not a plain in-app path is
 * discarded before the /admin prefix rule is even consulted.
 */
function adminDestinationFor(redirectTarget: string | null): string {
  const safe = safeRedirect(redirectTarget, '');
  return (safe === '/admin' || safe.startsWith('/admin/')) && safe !== '/admin/login'
    ? safe
    : '/admin';
}

/** The post-MFA destination for a staff account, honouring a named deep link. */
function staffDestinationFor(user: User, redirectTarget: string | null): string {
  if (user.roles.includes('admin')) return adminDestinationFor(redirectTarget);
  const safe = safeRedirect(redirectTarget, '');
  return safe === '/support' || safe.startsWith('/support/') ? safe : '/support';
}

type Phase = 'form' | 'checking' | 'challenge' | 'enroll';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const { user, loading, signIn, signOut, aal, mfaLoaded, refreshAal, mfaExempt } = useAuth();
  // This page lives outside the workspace shell, so nothing else applies
  // the user's stored colour-scheme preference for it: resolve (and apply)
  // it here, and hand the same answer to the two-factor steps, whose
  // `variant` styling keys off the surface they sit on (Batch 86).
  const theme = useThemePreference();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(searchParams.get('denied') === '1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledUserRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>('form');
  const [mfaUser, setMfaUser] = useState<User | null>(null);

  /**
   * Opens the second-factor step for a confirmed staff account: challenge
   * the factor it already holds, or enrol one now. Deciding takes one factor
   * read, so the phase passes through 'checking' rather than flashing the
   * wrong step.
   */
  const beginMfa = useCallback((staffUser: User) => {
    setMfaUser(staffUser);
    setPhase('checking');
    void listTotpFactors().then((lists) => {
      setPhase(lists?.verified.length ? 'challenge' : 'enroll');
    });
  }, []);

  /** The code verified: record the fresh step-up proof and hand over. */
  const completeMfa = async () => {
    markStepUpVerified();
    await refreshAal();
    const staffUser = mfaUser ?? user;
    if (staffUser) {
      navigate(staffDestinationFor(staffUser, redirectTarget), { replace: true });
    }
  };

  // A session that already exists when this page is reached (typed URL, the
  // guard's ?denied=1 redirect, or the AAL2 gate's ?stepup=1 bounce) gets the
  // same treatment as a fresh sign-in: staff continue — through the second
  // factor when their session is still at aal1 — and everyone else is signed
  // out and shown the denial.
  useEffect(() => {
    if (loading || !user) return;
    if (phase !== 'form') return; // the MFA step owns the flow once it opens
    if (handledUserRef.current === user.id) return;

    const home = staffHome(user.roles);
    if (!home) {
      handledUserRef.current = user.id;
      void signOut().then(() => setDenied(true));
      return;
    }
    // Wait for the two-factor picture before deciding: navigating on roles
    // alone would hand an aal1 session to a console that bounces it straight
    // back here, and starting a challenge before the factor list is known
    // could enrol a duplicate.
    if (!mfaLoaded) return;
    handledUserRef.current = user.id;
    // TEMPORARY testing exemption (Batch 86) — remove with the mfa_exemptions
    // table: an exempt account skips the second-factor step entirely and
    // lands the way an aal2 session does.
    if (aal === 'aal2' || mfaExempt) {
      navigate(staffDestinationFor(user, redirectTarget), { replace: true });
    } else {
      beginMfa(user);
    }
    // handledUserRef makes this idempotent, so the extra effect runs caused
    // by context identity changes are no-ops.
  }, [user, loading, phase, mfaLoaded, aal, mfaExempt, navigate, signOut, redirectTarget, beginMfa]);

  // The "use a different account" escape under the MFA step: signing out
  // resets the page to the form for the next visitor. (An effect keyed on
  // the context user would be wrong here — during a fresh sign-in the MFA
  // step is driven by the sign-in result before the context settles.)
  const handleMfaSignOut = async () => {
    await signOut();
    setPhase('form');
    setMfaUser(null);
    handledUserRef.current = null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDenied(false);

    if (!email.trim()) {
      setError('Please enter your staff email address');
      return;
    }
    // Sign-in never enforces the new-password policy (see password-policy.ts);
    // only presence is checked here, the server verifies the password itself.
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      const signedInUser = await signIn(email.trim(), password);
      const home = staffHome(signedInUser.roles);
      if (!home) {
        await signOut();
        setDenied(true);
        return;
      }
      // Staff, password proven — the second factor comes before any console.
      handledUserRef.current = signedInUser.id;
      // TEMPORARY testing exemption (Batch 86) — remove with the
      // mfa_exemptions table. Read fresh from the RPC here: the context's
      // copy is loaded with the sign-in's session application and may not
      // have landed in state yet. An exempt account lands directly, with
      // the step-up proof marked the way a verified code would mark it.
      if (await isMfaExempt()) {
        markStepUpVerified();
        navigate(staffDestinationFor(signedInUser, redirectTarget), { replace: true });
        return;
      }
      beginMfa(signedInUser);
    } catch (err: unknown) {
      setError(friendlyErrorText(err, { context: 'auth', staff: true }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // A signed-in staff visitor whose factor picture is still loading gets the
  // verifying state, never a flash of the password form they no longer need.
  const sessionSettling = Boolean(user && staffHome(user.roles) && phase === 'form' && !mfaLoaded);

  if (loading || sessionSettling) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sun-orange border-t-transparent" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Verifying access...</span>
        </div>
      </div>
    );
  }

  const inMfa = phase !== 'form';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 font-sans selection:bg-sun-orange/20 selection:text-sun-orange dark:bg-slate-950">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sun-orange/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-80 w-80 rounded-full bg-aqua/10 blur-[110px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
        <div className="mb-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to storefront
          </Link>
          <span className="font-outfit font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Staff only</span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
          <div className="mb-8 flex flex-col items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-orange text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--color-sun-orange)_40%,transparent)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-outfit text-[11px] font-bold uppercase tracking-[0.2em] text-sun-orange">
                Vendora Staff Console
              </p>
              <h1 className="mt-1 font-outfit text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {phase === 'enroll'
                  ? 'Set Up Two-Factor Authentication'
                  : inMfa
                    ? 'Two-Factor Check'
                    : 'Admin Sign In'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {phase === 'enroll'
                  ? 'Your staff account does not have an authenticator yet. Set one up now — the console opens as soon as the first code checks out.'
                  : inMfa
                    ? 'Your password checked out. One more proof before the console opens.'
                    : 'Restricted to Vendora staff accounts — administrators and support agents. Customer and seller accounts cannot sign in here.'}
              </p>
            </div>
          </div>

          {inMfa ? (
            <div className="flex flex-col gap-5">
              {phase === 'checking' && (
                <div className="flex items-center gap-3 py-2" role="status">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-sun-orange border-t-transparent" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">Checking your two-factor status…</span>
                </div>
              )}
              {phase === 'challenge' && (
                <TotpChallengeForm
                  variant={theme}
                  onVerified={() => void completeMfa()}
                  onNeedEnroll={() => setPhase('enroll')}
                />
              )}
              {phase === 'enroll' && (
                <TotpEnrollForm variant={theme} onEnrolled={() => void completeMfa()} />
              )}
              <p className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500 dark:border-white/10">
                Not your account?{' '}
                <button
                  type="button"
                  onClick={() => void handleMfaSignOut()}
                  className="font-bold text-sun-orange hover:text-sun-orange-600 cursor-pointer"
                >
                  Sign out and use a different account
                </button>
              </p>
            </div>
          ) : (
            <>
              {denied && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                >
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500 dark:text-rose-300" />
                  <span>
                    <span className="font-bold text-slate-900 dark:text-white">This account has no staff access.</span> It was signed
                    out of the staff console. If you are a customer or seller, please use the regular{' '}
                    <Link to="/login" className="font-bold text-sun-orange underline">
                      sign in page
                    </Link>
                    . If you believe you should have staff access, contact a Vendora administrator.
                  </span>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                >
                  <span className="h-1.5 w-1.5 shrink-0 animate-ping rounded-full bg-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="admin-login-email" className="font-outfit text-xs font-bold text-slate-600 dark:text-slate-300">
                    Staff Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="pointer-events-none absolute left-4 h-5 w-5 text-slate-500" />
                    <input
                      id="admin-login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@vendora.market"
                      autoComplete="username"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 shadow-2xs transition-all placeholder:text-slate-400 focus:border-sun-orange focus:outline-none focus:ring-2 focus:ring-sun-orange/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="admin-login-password" className="font-outfit text-xs font-bold text-slate-600 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="pointer-events-none absolute left-4 h-5 w-5 text-slate-500" />
                    <input
                      id="admin-login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      autoComplete="current-password"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-900 shadow-2xs transition-all placeholder:text-slate-400 focus:border-sun-orange focus:outline-none focus:ring-2 focus:ring-sun-orange/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="default" size="lg" disabled={isSubmitting} className="mt-2 w-full">
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Staff Console'}</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </form>

              <p className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-500 dark:border-white/10">
                Shopping or selling on Vendora?{' '}
                <Link to="/login" className="font-bold text-sun-orange hover:text-sun-orange-600">
                  Use the customer sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
