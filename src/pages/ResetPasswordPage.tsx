import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

/**
 * ResetPasswordPage — the landing page for Supabase password-recovery emails.
 *
 * The emailed link lands here with a recovery session in the URL; the Supabase
 * client picks it up and emits PASSWORD_RECOVERY (or exposes the session via
 * getSession). Only then is the set-new-password form shown — a bare visit
 * without a valid recovery link gets an honest "link invalid or expired"
 * state instead of a form that cannot work.
 */
export const ResetPasswordPage: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setPhase('ready');
    });
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!active) return;
      if (sessionData.session) setPhase('ready');
    });
    const fallback = window.setTimeout(() => {
      if (active) {
        setPhase((current) => (current === 'checking' ? 'invalid' : current));
      }
    }, 2000);
    return () => {
      active = false;
      window.clearTimeout(fallback);
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setPhase('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update your password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden pb-16 pt-4 sm:pt-8 font-sans selection:bg-sun-orange/20 selection:text-sun-orange">
      {/* No page-level background: RootLayout paints the one ambient
          gradient + orbs for the whole storefront tree. */}

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-white">Reset Password</span>
          </div>
          <Link
            to="/login"
            className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-sun-orange hover:text-sun-orange-600 transition-colors group"
          >
            <span>Back to Sign In</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Auth Card (same chrome as the sign-in card) */}
        <div className="relative mx-auto w-full max-w-xl rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/90 dark:border-white/10 shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden p-8 sm:p-10 lg:p-12">
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-sun-orange-200/30 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-aqua-100/40 blur-[110px] pointer-events-none" />

          <div className="relative">
            <div className="flex items-baseline">
              <span className="font-outfit text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none flex items-center">
                Vendora
                <span className="inline-block h-2 w-2 rounded-full bg-sun-orange ml-0.5 mb-0.5" />
              </span>
            </div>

            {phase === 'checking' && (
              <div className="mt-10 flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-sun-orange" />
                <p className="text-sm text-slate-600 dark:text-slate-300">Verifying your reset link…</p>
              </div>
            )}

            {phase === 'invalid' && (
              <div className="mt-8">
                <h1 className="font-outfit text-3xl text-slate-900 dark:text-white font-extrabold tracking-tight">
                  Link Invalid or Expired
                </h1>
                <p className="font-sans text-slate-600 dark:text-slate-300 text-sm mt-2 leading-relaxed">
                  This password reset link is invalid or has expired. Request a fresh one from the
                  sign-in page using <span className="font-semibold text-slate-900 dark:text-white">Forgot credentials?</span>,
                  then follow the new link in your inbox.
                </p>
                <Button asChild variant="default" size="lg" className="mt-6 w-full">
                  <Link to="/login">Back to Sign In</Link>
                </Button>
              </div>
            )}

            {phase === 'done' && (
              <div className="mt-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h1 className="mt-4 font-outfit text-3xl text-slate-900 dark:text-white font-extrabold tracking-tight">
                  Password Updated
                </h1>
                <p className="font-sans text-slate-600 dark:text-slate-300 text-sm mt-2 leading-relaxed">
                  Your password has been changed. Sign in with your new password to continue.
                </p>
                <Button asChild variant="default" size="lg" className="mt-6 w-full">
                  <Link to="/login">Continue to Sign In</Link>
                </Button>
              </div>
            )}

            {phase === 'ready' && (
              <div className="mt-8">
                <h1 className="font-outfit text-3xl text-slate-900 dark:text-white font-extrabold tracking-tight">
                  Set a New Password
                </h1>
                <p className="font-sans text-slate-600 dark:text-slate-300 text-sm mt-1">
                  Choose a new password for your Vendora account — at least 8 characters.
                </p>

                {error && (
                  <div
                    role="alert"
                    className="mt-5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 p-3.5 text-xs text-rose-700 dark:text-rose-300 font-medium animate-in fade-in flex items-center gap-2 backdrop-blur-md"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reset-password" className="font-outfit text-xs font-bold text-slate-700 dark:text-slate-300">
                      New Password
                    </label>
                    <Input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      autoComplete="new-password"
                      required
                      leftIcon={<Lock className="h-5 w-5" />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reset-confirm-password" className="font-outfit text-xs font-bold text-slate-700 dark:text-slate-300">
                      Confirm New Password
                    </label>
                    <Input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      autoComplete="new-password"
                      required
                      leftIcon={<Lock className="h-5 w-5" />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      }
                    />
                  </div>

                  <Button type="submit" variant="default" size="lg" disabled={isSubmitting} className="mt-2 w-full">
                    <span>{isSubmitting ? 'Updating…' : 'Update Password'}</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
