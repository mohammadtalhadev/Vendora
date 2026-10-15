import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { friendlyErrorText } from '../lib/friendly-error';
import { safeRedirect } from '../lib/safe-redirect';
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
 */
/** The console a staff role belongs to; null means "not staff at all". */
function staffHome(roles: string[]): '/admin' | '/support' | null {
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('support')) return '/support';
  return null;
}

/**
 * Only ever continue to an /admin path the guard named — never back to this
 * page, and never to an arbitrary URL.
 */
function adminDestinationFor(redirectTarget: string | null): string {
  const target = safeRedirect(redirectTarget, '');
  return target.startsWith('/admin') && target !== '/admin/login' ? target : '/admin';
}

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const { user, loading, signIn, signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(searchParams.get('denied') === '1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledUserRef = useRef<string | null>(null);

  // A session that already exists when this page is reached (typed URL, or
  // the guard's ?denied=1 redirect) gets the same treatment as a fresh
  // sign-in: staff continue to their console, everyone else is signed out
  // and shown the denial.
  useEffect(() => {
    if (loading || !user) return;
    if (handledUserRef.current === user.id) return;
    handledUserRef.current = user.id;

    const home = staffHome(user.roles);
    if (home) {
      navigate(user.roles.includes('admin') ? adminDestinationFor(redirectTarget) : home, { replace: true });
    } else {
      void signOut().then(() => setDenied(true));
    }
    // handledUserRef makes this idempotent, so the extra effect runs caused
    // by context identity changes are no-ops.
  }, [user, loading, navigate, signOut, redirectTarget]);

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
      navigate(signedInUser.roles.includes('admin') ? adminDestinationFor(redirectTarget) : home);
    } catch (err: unknown) {
      setError(friendlyErrorText(err, { context: 'auth', staff: true }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sun-orange border-t-transparent" />
          <span className="text-xs font-bold text-slate-400">Verifying access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans selection:bg-sun-orange/20 selection:text-sun-orange">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sun-orange/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-80 w-80 rounded-full bg-aqua/10 blur-[110px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
        <div className="mb-6 flex items-center justify-between text-xs text-slate-400">
          <Link to="/" className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to storefront
          </Link>
          <span className="font-outfit font-bold uppercase tracking-widest text-slate-500">Staff only</span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <div className="mb-8 flex flex-col items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-orange text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--color-sun-orange)_40%,transparent)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-outfit text-[11px] font-bold uppercase tracking-[0.2em] text-sun-orange">
                Vendora Staff Console
              </p>
              <h1 className="mt-1 font-outfit text-3xl font-extrabold tracking-tight text-white">
                Admin Sign In
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Restricted to Vendora staff accounts — administrators and support agents. Customer and
                seller accounts cannot sign in here.
              </p>
            </div>
          </div>

          {denied && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200"
            >
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              <span>
                <span className="font-bold text-white">This account has no staff access.</span> It was signed
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
              className="mb-5 flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-200"
            >
              <span className="h-1.5 w-1.5 shrink-0 animate-ping rounded-full bg-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-login-email" className="font-outfit text-xs font-bold text-slate-300">
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
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm text-white shadow-2xs transition-all placeholder:text-slate-500 focus:border-sun-orange focus:outline-none focus:ring-2 focus:ring-sun-orange/30"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-login-password" className="font-outfit text-xs font-bold text-slate-300">
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
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-12 text-sm text-white shadow-2xs transition-all placeholder:text-slate-500 focus:border-sun-orange focus:outline-none focus:ring-2 focus:ring-sun-orange/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-500 transition-colors hover:text-slate-200"
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

          <p className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-slate-500">
            Shopping or selling on Vendora?{' '}
            <Link to="/login" className="font-bold text-sun-orange hover:text-sun-orange-600">
              Use the customer sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
