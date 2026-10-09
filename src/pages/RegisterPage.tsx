import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Store, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const { mergeGuestCartIntoUser } = useCartStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Vendora Terms & Policies');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = register(name, email, password);
      mergeGuestCartIntoUser(newUser.id);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
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
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#0071DC] hover:underline">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
          {error && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0071DC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 transition-all"
                  required
                />
              </div>
            </div>

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
                  placeholder="sarah@example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0071DC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0071DC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#0071DC] focus:ring-[#0071DC]"
                />
                <span>
                  I agree to the{' '}
                  <span className="text-[#0071DC] hover:underline cursor-pointer">Terms of Service</span> and{' '}
                  <span className="text-[#0071DC] hover:underline cursor-pointer">Privacy Policy</span>.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#0071DC] hover:bg-[#005bb5] text-white py-3 px-4 text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Become a Seller Callout */}
          <div className="mt-8 pt-6 border-t border-slate-100 bg-amber-50/60 -mx-6 -mb-6 p-6 rounded-b-3xl border-b border-x border-amber-200/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A1A]/10 text-[#FF7A1A]">
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900">Want to sell on Vendora?</h4>
                <p className="text-[11px] text-slate-600">Reach millions of buyers with verified vendor storefronts.</p>
              </div>
              <Link
                to="/become-a-seller"
                className="shrink-0 rounded-full bg-[#FF7A1A] hover:bg-[#e0650f] text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors"
              >
                Apply
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
