import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuthStore, DEMO_ACCOUNTS } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { login, loginAsDemoRole } = useAuthStore();
  const { mergeGuestCartIntoUser } = useCartStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = login(email, password);
      mergeGuestCartIntoUser(loggedInUser.id);

      // Smart role-based redirect if no explicit redirect specified
      if (redirectPath === '/') {
        if (loggedInUser.roles.includes('admin')) {
          navigate('/admin');
          return;
        }
        if (loggedInUser.roles.includes('vendor')) {
          navigate('/vendor');
          return;
        }
        if (loggedInUser.roles.includes('rider')) {
          navigate('/rider');
          return;
        }
        if (loggedInUser.roles.includes('support')) {
          navigate('/support');
          return;
        }
      }

      navigate(redirectPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid login credentials';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoQuickLogin = (roleKey: 'customer' | 'newuser' | 'vendor' | 'admin' | 'support' | 'rider') => {
    loginAsDemoRole(roleKey);
    const demoUser = DEMO_ACCOUNTS[roleKey];
    if (demoUser) {
      mergeGuestCartIntoUser(demoUser.id);
    }

    if (roleKey === 'admin') navigate('/admin');
    else if (roleKey === 'vendor') navigate('/vendor');
    else if (roleKey === 'rider') navigate('/rider');
    else if (roleKey === 'support') navigate('/support');
    else navigate(redirectPath);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-blue-50/50 via-slate-50 to-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
            <svg
              className="w-9 h-9 text-[#0071DC] fill-current shrink-0 transition-transform group-hover:rotate-12 duration-300"
              viewBox="0 0 24 24"
            >
              <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-3 0v-3.5A1.5 1.5 0 0 1 12 2zm0 13.5a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-3 0V17a1.5 1.5 0 0 1 1.5-1.5zm8.5-4.5a1.5 1.5 0 0 1-1.5 1.5h-3.5a1.5 1.5 0 0 1 0-3H19a1.5 1.5 0 0 1 1.5 1.5zM7 12.5a1.5 1.5 0 0 1-1.5 1.5H2a1.5 1.5 0 0 1 0-3h3.5A1.5 1.5 0 0 1 7 12.5zm10.78-6.72a1.5 1.5 0 0 1 0 2.12l-2.47 2.47a1.5 1.5 0 1 1-2.12-2.12l2.47-2.47a1.5 1.5 0 0 1 2.12 0zm-8.2 8.2a1.5 1.5 0 0 1 0 2.12L7.1 18.57a1.5 1.5 0 1 1-2.12-2.12l2.47-2.47a1.5 1.5 0 0 1 2.12 0zm8.2 2.12a1.5 1.5 0 0 1-2.12 0l-2.47-2.47a1.5 1.5 0 1 1 2.12-2.12l2.47 2.47a1.5 1.5 0 0 1 0 2.12zM8.78 5.78a1.5 1.5 0 0 1-2.12 2.12L4.19 5.43a1.5 1.5 0 1 1 2.12-2.12l2.47 2.47z" />
            </svg>
            <span className="text-3xl font-black tracking-tight text-slate-900 leading-none">
              Vendora
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Or{' '}
            <Link to="/register" className="font-semibold text-[#0071DC] hover:underline">
              create a new account for free
            </Link>
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
          {error && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0071DC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <span className="text-xs text-[#0071DC] hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-11 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0071DC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-[#0071DC] focus:ring-[#0071DC]"
                />
                Remember this device
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#0071DC] hover:bg-[#005bb5] text-white py-3 px-4 text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Persona Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                1-Click Demo Login
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Pre-seeded accounts</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('customer')}
                className="flex flex-col items-start p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left group cursor-pointer"
              >
                <span className="font-bold text-slate-800 group-hover:text-[#0071DC]">Customer</span>
                <span className="text-[10px] text-slate-400">Order history & cart</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoQuickLogin('vendor')}
                className="flex flex-col items-start p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-amber-50 hover:border-amber-200 transition-colors text-left group cursor-pointer"
              >
                <span className="font-bold text-slate-800 group-hover:text-amber-700">Vendor</span>
                <span className="text-[10px] text-slate-400">Store & orders console</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoQuickLogin('admin')}
                className="flex flex-col items-start p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-purple-50 hover:border-purple-200 transition-colors text-left group cursor-pointer"
              >
                <span className="font-bold text-slate-800 group-hover:text-purple-700">Admin</span>
                <span className="text-[10px] text-slate-400">Governance & moderation</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoQuickLogin('rider')}
                className="flex flex-col items-start p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-left group cursor-pointer"
              >
                <span className="font-bold text-slate-800 group-hover:text-emerald-700">Delivery Rider</span>
                <span className="text-[10px] text-slate-400">PIN handover queue</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoQuickLogin('support')}
                className="flex flex-col items-start p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-cyan-50 hover:border-cyan-200 transition-colors text-left group cursor-pointer"
              >
                <span className="font-bold text-slate-800 group-hover:text-cyan-700">Support Agent</span>
                <span className="text-[10px] text-slate-400">Triage & disputes thread</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoQuickLogin('newuser')}
                className="flex flex-col items-start p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 transition-colors text-left group cursor-pointer"
              >
                <span className="font-bold text-slate-800 group-hover:text-slate-900">New User</span>
                <span className="text-[10px] text-slate-400">Seller application flow</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
