import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Truck,
  Sparkles,
  Check,
  Store,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { requestPasswordReset } from '../features/auth/api/session';
import {
  landingPath,
  resolvePostLoginLanding,
  setLastWorkspace,
} from '../features/auth/api/destinations';
import { friendlyErrorText } from '../lib/friendly-error';
import type { DemoRoleKey } from '../lib/demo-accounts';
import { useCartStore } from '../store/cart-store';
import { Button } from '../components/ui/button';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // The raw redirect is never navigated to directly — it is judged by
  // resolvePostLoginLanding, which runs it through safeRedirect and checks
  // it against the roles the backend actually gave this account (Batch 63).
  const rawRedirect = searchParams.get('redirect');

  const { user, loading, signIn, signInAsDemo, signInWithProvider, signOut } = useAuth();
  const { mergeGuestCartIntoUser } = useCartStore();
  // A session whose landing this page has already decided (a fresh sign-in
  // handled below, a demo persona, or the already-signed-in effect). The
  // effect must never re-decide a landing the submit handler just made.
  const landingHandledRef = useRef<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  // The sign-in path the visitor picked. This is not decoration: handleSubmit
  // routes by it (Buyer → storefront, Verified Seller → merchant console) and
  // refuses a seller-path sign-in for an account with no vendor role.
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>('buyer');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetHint, setShowResetHint] = useState(false);
  const [resetState, setResetState] = useState<'idle' | 'needs-email' | 'sending' | 'sent' | 'error'>('idle');
  const [resetError, setResetError] = useState<string | null>(null);
  const [showDemoGrid, setShowDemoGrid] = useState(false);
  const resetHintTriggerRef = useRef<HTMLButtonElement>(null);
  const demoTriggerRef = useRef<HTMLButtonElement>(null);

  // Already signed-in visitors never see this form (Batch 63): once the
  // session's profile is resolved, the same precedence as a fresh sign-in
  // decides where they belong — the redirect they arrived with first, then
  // their remembered workspace or the chooser. While auth is loading (and
  // while a landing is being applied) the page renders its spinner, so the
  // form never flashes for someone who is about to be moved on.
  useEffect(() => {
    if (loading || !user) return;
    if (landingHandledRef.current === user.id) return;
    landingHandledRef.current = user.id;
    const decision = resolvePostLoginLanding(user, { redirect: rawRedirect, intent: null });
    const path = landingPath(decision);
    if (path) navigate(path, { replace: true });
  }, [user, loading, navigate, rawRedirect]);

  const workspaceForRole = (roleKey: DemoRoleKey) => {
    if (roleKey === 'admin') return '/admin';
    if (roleKey === 'vendor') return '/vendor';
    if (roleKey === 'rider') return '/rider';
    if (roleKey === 'support') return '/support';
    return '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    // Sign-in never enforces the new-password policy (see password-policy.ts):
    // an older account must still be able to log in. Only presence is checked;
    // the server verifies the password itself.
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await signIn(email.trim(), password);
      // This sign-in's landing is decided here, once — the already-signed-in
      // effect above must not re-decide it when the session lands in state.
      landingHandledRef.current = loggedInUser.id;

      // Post-login precedence (Batch 63, shared with the chooser and the
      // guards via features/auth/api/destinations):
      //   1. A ?redirect= the account's roles cover wins outright. One they
      //      do NOT cover is a dead end with an explanation (/no-access) —
      //      never a bounce back into a guard, which would loop. A seller
      //      whose application is still in flight lands on /seller-status.
      //   2. The toggle is the visitor's stated path: Verified Seller means
      //      the merchant console, and an account with no vendor role at all
      //      is still refused on that path (below) — Buyer carries no
      //      workspace intent, so precedence falls through to the account.
      //   3. Rider/support-only accounts keep their Batch 59 auto-landing;
      //      a multi-workspace account goes to its remembered workspace or
      //      the workspace chooser; everyone else to the storefront.
      // The user object here is the profile signIn() just loaded fresh from
      // the backend, so an approval granted minutes ago is already visible.
      const decision = resolvePostLoginLanding(loggedInUser, {
        redirect: rawRedirect,
        intent: selectedRole,
      });

      if (decision.kind === 'not-a-seller') {
        await signOut();
        landingHandledRef.current = null;
        setError(
          'This account is not a verified seller account, so it cannot sign in through the seller path. Switch to Buyer to shop with this account, or apply to sell on Vendora first.',
        );
        return;
      }

      mergeGuestCartIntoUser(loggedInUser.id);
      if (decision.kind === 'path') setLastWorkspace(loggedInUser.id, decision.path);
      navigate(landingPath(decision));
    } catch (err: unknown) {
      setError(friendlyErrorText(err, { context: 'auth' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const target = email.trim();
    setShowResetHint(true);
    if (!target) {
      setResetState('needs-email');
      return;
    }
    setResetState('sending');
    setResetError(null);
    try {
      await requestPasswordReset(target);
      setResetState('sent');
    } catch (err: unknown) {
      setResetError(friendlyErrorText(err, { context: 'auth' }));
      setResetState('error');
    }
  };

  const handleDemoQuickLogin = async (roleKey: DemoRoleKey) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await signInAsDemo(roleKey);
      // Demo personas keep their own direct workspace map; mark the session
      // handled so the already-signed-in effect does not re-decide it.
      landingHandledRef.current = user.id;
      mergeGuestCartIntoUser(user.id);
      navigate(workspaceForRole(roleKey));
    } catch (err: unknown) {
      setError(
        `${friendlyErrorText(err, { context: 'auth' })} — has the demo data been seeded into Supabase?`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithProvider(provider);
    } catch (err: unknown) {
      setError(friendlyErrorText(err, { context: 'auth' }));
      setIsSubmitting(false);
    }
  };

  // While the session is resolving — or already resolved, in which case
  // the effect above is moving the visitor on — the form stays hidden.
  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sun-orange border-t-transparent" />
          <span className="text-xs font-bold text-slate-400">Verifying access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-16 pt-4 sm:pt-8 font-sans selection:bg-sun-orange/20 selection:text-sun-orange">
      {/* No page-level background: RootLayout paints the one ambient
          gradient + orbs for the whole storefront tree. */}

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-white">Sign In</span>
          </div>
          <Link
            to="/register"
            className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-sun-orange hover:text-sun-orange-600 transition-colors group"
          >
            <span>Don't have an account? Create one</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* =========================================================================
            2. Main Frosted Glass Card (2-Column Grid)
           ========================================================================= */}
        <div className="relative w-full rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden lg:grid lg:grid-cols-12 min-h-[720px]">
          {/* Subtle Ambient Reflections */}
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-sun-orange-200/30 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-aqua-100/40 blur-[110px] pointer-events-none" />

          {/* =========================================================================
              LEFT COLUMN: Brand & Trust Showcase (5 Cols)
             ========================================================================= */}
          <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-white/45 dark:bg-white/[0.03] backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-white/70 dark:border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-sun-orange-200/30 via-aqua-100/20 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center gap-3.5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline">
                    <span className="font-outfit text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none flex items-center">
                      Vendora
                      <span className="inline-block h-2 w-2 rounded-full bg-sun-orange ml-0.5 mb-0.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Value Proposition & KPI Cards */}
            <div className="relative z-10 my-8 flex flex-col gap-6">
              <div className="flex flex-col">
                <h2 className="font-outfit text-3xl lg:text-4xl text-slate-900 dark:text-white tracking-tight font-black leading-tight">
                  Tech, Fashion and Home Goods from Independent Sellers
                </h2>
                <p className="font-sans text-sm lg:text-base text-slate-600 dark:text-slate-300 mt-3 font-normal leading-relaxed">
                  Discover verified independent sellers, secure escrow checkout, and fast doorstep delivery across Pakistan.
                </p>
              </div>

              {/* 3 Frosted Metric Badges */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-aqua-50 dark:bg-cyan-950/40 text-aqua flex items-center justify-center shrink-0 border border-aqua-100 dark:border-cyan-800/40">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-outfit text-sm text-slate-900 dark:text-white font-bold">Stores Across Pakistan</span>
                    <span className="font-sans text-xs text-slate-500 dark:text-slate-400">Independent sellers for fashion, tech & home goods</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sun-orange-50 dark:bg-orange-950/40 text-sun-orange flex items-center justify-center shrink-0 border border-sun-orange-200 dark:border-orange-800/40">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-outfit text-sm text-slate-900 dark:text-white font-bold">100% Escrow Protected</span>
                    <span className="font-sans text-xs text-slate-500 dark:text-slate-400">Safe checkout with funds held securely until delivery</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-lemon-100 dark:bg-yellow-950/40 text-[#CA8A04] dark:text-yellow-400 flex items-center justify-center shrink-0 border border-lemon-200 dark:border-yellow-800/40">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-outfit text-sm text-slate-900 dark:text-white font-bold">24–48h Express Dispatch</span>
                    <span className="font-sans text-xs text-slate-500 dark:text-slate-400">Nationwide delivery network with live rider tracking</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* =========================================================================
              RIGHT COLUMN: Interactive Sign In Form Panel (7 Cols)
             ========================================================================= */}
          <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl relative">
            <div>
              {/* Mode Switcher Tabs & Role Chips */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Segmented Auth Mode Tabs */}
                <div className="p-1 rounded-full bg-slate-200/50 dark:bg-white/10 border border-white/60 dark:border-white/10 flex items-center shadow-inner">
                  <button
                    type="button"
                    className="px-5 py-2 rounded-full bg-sun-orange text-white font-outfit font-semibold text-sm shadow-[0_4px_14px_color-mix(in_srgb,var(--color-sun-orange)_32%,transparent)] transition-all cursor-pointer"
                  >
                    Sign In
                  </button>
                  <Link
                    to="/register"
                    className="px-5 py-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-outfit font-semibold text-sm transition-all"
                  >
                    Register
                  </Link>
                </div>

                {/* Role Switcher Chips */}
                <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/50 dark:bg-white/10 border border-white/60 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('buyer')}
                    aria-pressed={selectedRole === 'buyer'}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedRole === 'buyer'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('seller')}
                    aria-pressed={selectedRole === 'seller'}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedRole === 'seller'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Verified Seller
                  </button>
                </div>
              </div>

              {/* Portal Header */}
              <div className="my-6">
                <h1 className="font-outfit text-3xl text-slate-900 dark:text-white font-extrabold tracking-tight">
                  Welcome Back
                </h1>
                <p className="font-sans text-slate-600 dark:text-slate-300 text-sm mt-1">
                  {selectedRole === 'seller'
                    ? 'Authenticate to access your verified merchant store and payouts'
                    : 'Sign in to access your orders, cart, and profile'}
                </p>
              </div>

              {/* Social Authentication (Google & Apple) */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialSignIn('google')}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-800 dark:text-slate-100 transition-all shadow-xs group cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="font-outfit text-xs font-bold text-slate-800 dark:text-slate-100">Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialSignIn('apple')}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-800 dark:text-slate-100 transition-all shadow-xs group cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-slate-900 dark:fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.16.65-2.83 1.43-.58.67-1.1 1.74-1.01 2.78 1.08.08 2.22-.59 2.83-1.34z" />
                  </svg>
                  <span className="font-outfit text-xs font-bold text-slate-800 dark:text-slate-100">Apple ID</span>
                </button>
              </div>

              {/* Minimal Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="w-full h-px bg-slate-200 dark:bg-white/10" />
                <span className="absolute px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs text-slate-500 font-semibold rounded-full border border-slate-200 dark:border-white/10 shadow-2xs">
                  Or Continue
                </span>
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 p-3.5 text-xs text-rose-700 dark:text-rose-300 font-medium animate-in fade-in flex items-center gap-2 backdrop-blur-md"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
                  <span>{error}</span>
                </div>
              )}

              {/* Credentials Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-email" className="font-outfit text-xs font-bold text-slate-700 dark:text-slate-300">
                    {selectedRole === 'seller' ? 'Merchant Identifier or Email' : 'Email Address'}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={selectedRole === 'seller' ? 'store@vendora.market' : 'name@example.com'}
                      className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="font-outfit text-xs font-bold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      ref={resetHintTriggerRef}
                      onClick={handleForgotPassword}
                      onKeyDown={(e) => { if (e.key === 'Escape') setShowResetHint(false); }}
                      aria-expanded={showResetHint}
                      aria-controls="login-reset-hint"
                      className="text-xs text-sun-orange hover:text-sun-orange-600 transition-colors font-semibold cursor-pointer"
                    >
                      Forgot credentials?
                    </button>
                  </div>
                  {showResetHint && (
                    <div
                      id="login-reset-hint"
                      role="status"
                      onKeyDown={(e) => { if (e.key === 'Escape') { setShowResetHint(false); resetHintTriggerRef.current?.focus(); } }}
                      className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/40 text-[11px] text-slate-600 dark:text-slate-300"
                    >
                      {resetState === 'needs-email' && (
                        <>Enter your email address above, then choose <span className="font-bold text-sun-orange">Forgot credentials?</span> again and we will email you a secure link to set a new password.</>
                      )}
                      {resetState === 'sending' && <>Sending your password reset link…</>}
                      {resetState === 'sent' && (
                        <>
                          Password reset link sent to <span className="font-bold text-sun-orange">{email.trim()}</span>. Check your inbox and follow the link to set a new password.
                          <span className="mt-1.5 flex items-center justify-between gap-2">
                            <span>Didn&apos;t get it? Check your spam or junk folder.</span>
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              className="shrink-0 font-bold text-sun-orange hover:text-sun-orange-600 transition-colors cursor-pointer"
                            >
                              Resend email
                            </button>
                          </span>
                        </>
                      )}
                      {resetState === 'error' && (
                        <>We could not send the reset email{resetError ? <>: {resetError}</> : ''}. Check the address and try again.</>
                      )}
                      {resetState === 'idle' && <>We will email you a secure link to set a new password.</>}
                    </div>
                  )}
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full h-12 pl-12 pr-12 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shadow-2xs peer-focus-visible:ring-2 peer-focus-visible:ring-sun-orange/40 ${
                        rememberMe
                          ? 'border-sun-orange bg-sun-orange'
                          : 'border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-800'
                      }`}
                    >
                      {rememberMe && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      Remember me for 30 days
                    </span>
                  </label>
                </div>

                {/* Primary CTA Button */}
                <Button type="submit" variant="default" size="lg" disabled={isSubmitting} className="mt-2 w-full">
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Vendora'}</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </form>

              {/* 1-Click Demo Testing Drawer Toggle — local development only */}
              {import.meta.env.DEV && (
              <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  ref={demoTriggerRef}
                  onClick={() => setShowDemoGrid((prev) => !prev)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowDemoGrid(false); }}
                  aria-expanded={showDemoGrid}
                  aria-controls="login-demo-grid"
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-sun-orange" />
                    <span>Quick Demo Personas (1-Click Login)</span>
                  </span>
                  <span className="text-[11px] text-sun-orange">{showDemoGrid ? 'Hide' : 'Show Roles'}</span>
                </button>

                {showDemoGrid && (
                  <div
                    id="login-demo-grid"
                    onKeyDown={(e) => { if (e.key === 'Escape') { setShowDemoGrid(false); demoTriggerRef.current?.focus(); } }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-2"
                  >
                    <button
                      type="button"
                      onClick={() => handleDemoQuickLogin('customer')}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-sun-orange text-left transition-all cursor-pointer text-xs"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block">Customer</span>
                      <span className="text-[10px] text-slate-400">Buyer catalog</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoQuickLogin('vendor')}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-sun-orange text-left transition-all cursor-pointer text-xs"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block">Vendor</span>
                      <span className="text-[10px] text-slate-400">Store console</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoQuickLogin('admin')}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-sun-orange text-left transition-all cursor-pointer text-xs"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block">Admin</span>
                      <span className="text-[10px] text-slate-400">Full workspace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoQuickLogin('rider')}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-sun-orange text-left transition-all cursor-pointer text-xs"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block">Rider</span>
                      <span className="text-[10px] text-slate-400">PIN deliveries</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoQuickLogin('support')}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-sun-orange text-left transition-all cursor-pointer text-xs"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block">Support</span>
                      <span className="text-[10px] text-slate-400">Disputes desk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoQuickLogin('newuser')}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-sun-orange text-left transition-all cursor-pointer text-xs"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block">New User</span>
                      <span className="text-[10px] text-slate-400">Fresh account</span>
                    </button>
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Bottom Security Footer */}
            <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-600 dark:text-slate-300">New to Vendora?</span>
                <Link
                  to="/register"
                  className="font-outfit text-xs text-sun-orange hover:text-sun-orange-600 font-bold underline transition-colors"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
