import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Store,
  ArrowRight,
  Check,
  CheckCircle2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Sparkles,
  Star,
  Award,
  ShoppingBag,
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, login } = useAuthStore();
  const { mergeGuestCartIntoUser } = useCartStore();

  const [accountType, setAccountType] = useState<'customer' | 'seller'>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [subscribeNews, setSubscribeNews] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Password Strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200', textColor: 'text-slate-400' };
    let score = 1; // Any non-empty input starts as at least Weak
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8 && /[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-600' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-600' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
      case 4:
      default:
        return { score: 4, label: 'Strong', color: 'bg-emerald-600', textColor: 'text-emerald-700' };
    }
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

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

      if (accountType === 'seller') {
        navigate('/become-a-seller');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Social Sign Up Simulation
  const handleSocialSignUp = (provider: 'google' | 'apple') => {
    setIsSubmitting(true);
    try {
      const mockEmail = provider === 'google' ? 'shopper.google@gmail.com' : 'shopper.apple@icloud.com';
      const mockName = provider === 'google' ? 'Google Shopper' : 'Apple Shopper';
      const loggedUser = login(mockEmail, 'demo123');
      mergeGuestCartIntoUser(loggedUser.id);
      navigate('/');
    } catch {
      setError(`Failed to sign up with ${provider}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-4 sm:pt-8 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb / Top Bar */}
        <div className="mb-6 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900">Create Account</span>
          </div>
          <Link
            to="/login"
            className="hidden sm:inline-flex items-center gap-1 font-semibold text-[#FF7A1A] hover:text-[#EA580C] transition-colors"
          >
            <span>Already have an account? Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Main 2-Column Split Container */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-200/50 lg:grid lg:grid-cols-12">
          {/* =========================================================================
              LEFT COLUMN: Visual Brand Showcase & Value Propositions (5 Cols)
              Matching the luxury Dark Midnight aesthetic of the HomePage Hero
             ========================================================================= */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] p-8 sm:p-12 text-white lg:col-span-5">
            {/* Background Ambient Glows */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#FF7A1A]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl" />

            {/* Brand Logo & Privilege Pill */}
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <Link to="/" className="inline-flex items-center gap-2.5 group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF7A1A] to-amber-500 shadow-md shadow-orange-500/30 group-hover:scale-105 transition-transform duration-300">
                    <svg
                      className="h-6 w-6 text-white fill-current shrink-0"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-3 0v-3.5A1.5 1.5 0 0 1 12 2zm0 13.5a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-3 0V17a1.5 1.5 0 0 1 1.5-1.5zm8.5-4.5a1.5 1.5 0 0 1-1.5 1.5h-3.5a1.5 1.5 0 0 1 0-3H19a1.5 1.5 0 0 1 1.5 1.5zM7 12.5a1.5 1.5 0 0 1-1.5 1.5H2a1.5 1.5 0 0 1 0-3h3.5A1.5 1.5 0 0 1 7 12.5zm10.78-6.72a1.5 1.5 0 0 1 0 2.12l-2.47 2.47a1.5 1.5 0 1 1-2.12-2.12l2.47-2.47a1.5 1.5 0 0 1 2.12 0zm-8.2 8.2a1.5 1.5 0 0 1 0 2.12L7.1 18.57a1.5 1.5 0 1 1-2.12-2.12l2.47-2.47a1.5 1.5 0 0 1 2.12 0zm8.2 2.12a1.5 1.5 0 0 1-2.12 0l-2.47-2.47a1.5 1.5 0 1 1 2.12-2.12l2.47 2.47a1.5 1.5 0 0 1 0 2.12zM8.78 5.78a1.5 1.5 0 0 1-2.12 2.12L4.19 5.43a1.5 1.5 0 1 1 2.12-2.12l2.47 2.47z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-black tracking-tight text-white font-outfit">
                    Vendora
                  </span>
                </Link>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-bold text-[#FF7A1A]">
                  <Sparkles className="h-3 w-3" />
                  <span>Member Perks</span>
                </div>
              </div>

              {/* Headline */}
              <div className="mt-8">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight font-outfit">
                  Unlock Premier Tech Deals & Verified Shopping.
                </h1>
                <p className="mt-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Join over 50,000+ satisfied buyers accessing exclusive flash sales, guaranteed 30-day returns, and real-time order tracking.
                </p>
              </div>

              {/* Floating Product Preview Showcase (Echoing HomePage Hero Apple Watch / Tech) */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all hover:bg-white/[0.08]">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-white/10">
                    <img
                      src="/images/emox/hero_apple_watch.jpg"
                      alt="Apple Watch Series 10"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/bevesi/1-13.jpg';
                      }}
                    />
                    <span className="absolute left-1 top-1 rounded-md bg-[#FF7A1A] px-1 py-0.2 text-[8px] font-black uppercase text-white">
                      -20%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>4.9</span>
                      <span className="text-slate-400 font-normal">(1,420+ reviews)</span>
                    </div>
                    <h4 className="truncate text-xs font-bold text-white mt-0.5">
                      Apple Watch Series 10 Starting at $399*
                    </h4>
                    <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                      Member Welcome Special • Free Express Shipping
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Benefits List */}
              <div className="mt-6 space-y-3.5 text-xs text-slate-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-bold text-white">Up to $20 Welcome Coupon</span>
                    <p className="text-[11px] text-slate-400">Applied automatically at checkout on your first verified order.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#FF7A1A]/20 text-[#FF7A1A]">
                    <Truck className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-bold text-white">Live Delivery Handover</span>
                    <p className="text-[11px] text-slate-400">Secure 4-digit PIN verification with assigned local riders.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <ShieldCheck className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-bold text-white">100% Genuine Escrow Protection</span>
                    <p className="text-[11px] text-slate-400">Full refunds guaranteed if items don’t match listing specifications.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Social Proof & Trust Avatars */}
            <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center gap-3.5">
              <div className="flex -space-x-2">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Customer"
                  className="h-8 w-8 rounded-full border-2 border-slate-900 object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Customer"
                  className="h-8 w-8 rounded-full border-2 border-slate-900 object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Customer"
                  className="h-8 w-8 rounded-full border-2 border-slate-900 object-cover"
                />
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-[#FF7A1A] text-[10px] font-black text-white">
                  50k+
                </div>
              </div>
              <div className="text-[11px] text-slate-300">
                <span className="font-bold text-white">Rated 4.9/5</span> across 12,000+ reviews
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: High-Accuracy Registration Form (7 Cols)
             ========================================================================= */}
          <div className="p-6 sm:p-10 lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Account Intent Switcher (Customer vs Seller) */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-outfit">
                    Create your account
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Fill in your details below to activate your marketplace profile.
                  </p>
                </div>

                {/* Account Type Selector Pills */}
                <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setAccountType('customer')}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      accountType === 'customer'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-[#FF7A1A]" />
                    <span>Shopper</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('seller')}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      accountType === 'seller'
                        ? 'bg-[#FF7A1A] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>Merchant</span>
                  </button>
                </div>
              </div>

              {/* Seller Mode Notice */}
              {accountType === 'seller' && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-xs text-amber-900">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200/60 text-amber-800">
                    <Store className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold">Merchant Registration Selected</span>
                    <p className="text-[11px] text-amber-700">
                      You will register your primary account and then be routed to complete your storefront verification.
                    </p>
                  </div>
                </div>
              )}

              {/* 1-Click Social Sign-Up Options */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => handleSocialSignUp('google')}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialSignUp('apple')}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="h-4 w-4 fill-current text-slate-900" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.77 1.04-1.85.93-2.93-.9.04-2 .6-2.64 1.36-.56.65-1.05 1.73-.92 2.79 1.01.08 2.01-.5 2.63-1.22z" />
                  </svg>
                  <span>Apple ID</span>
                </button>
              </div>

              {/* Or Divider */}
              <div className="relative mb-5 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Or register with email
                </span>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium animate-in fade-in flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Sarah Jenkins"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#FF7A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/20 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sarah.jenkins@example.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#FF7A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/20 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password & Live Strength Meter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Password
                    </label>
                    {password && (
                      <span className={`text-[11px] font-bold ${strength.textColor}`}>
                        Strength: {strength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-11 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#FF7A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/20 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator Bars */}
                  {password && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            bar <= strength.score ? strength.color : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password with match check */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Confirm Password
                    </label>
                    {passwordsMatch && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Passwords match
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className={`w-full rounded-2xl border bg-slate-50/50 pl-10 pr-11 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none transition-all ${
                        confirmPassword && !passwordsMatch
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-[#FF7A1A] focus:ring-2 focus:ring-[#FF7A1A]/20'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms and Newsletter checkboxes */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#FF7A1A] focus:ring-[#FF7A1A] accent-[#FF7A1A]"
                    />
                    <span>
                      I agree to the{' '}
                      <span className="text-[#FF7A1A] hover:underline cursor-pointer font-semibold">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="text-[#FF7A1A] hover:underline cursor-pointer font-semibold">
                        Privacy Policy
                      </span>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={subscribeNews}
                      onChange={(e) => setSubscribeNews(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#FF7A1A] focus:ring-[#FF7A1A] accent-[#FF7A1A]"
                    />
                    <span>Receive exclusive subscriber flash sale alerts & coupon codes.</span>
                  </label>
                </div>

                {/* Primary Orange Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[#FF7A1A] hover:bg-[#EA580C] text-white py-3.5 px-4 text-sm font-bold shadow-lg shadow-orange-500/25 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {isSubmitting
                      ? 'Creating your account...'
                      : accountType === 'seller'
                      ? 'Continue to Seller Verification'
                      : 'Create Account & Claim Rewards'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Bottom Card Footer with Security Assurance & Sign In Link */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>256-bit bank-grade encryption</span>
              </div>

              <div>
                Already a member?{' '}
                <Link to="/login" className="font-bold text-[#FF7A1A] hover:underline">
                  Sign in here
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BOTTOM TRUST STRIP: 4 Value Propositions Matching Storefront Footer
           ========================================================================= */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF7A1A]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Fast & Free Shipping</h4>
              <p className="text-[11px] text-slate-500">Free delivery on orders over $50</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">100% Authentic</h4>
              <p className="text-[11px] text-slate-500">Genuine items from verified brands</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">30-Day Easy Returns</h4>
              <p className="text-[11px] text-slate-500">Hassle-free refunds & exchanges</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">24/7 Dedicated Support</h4>
              <p className="text-[11px] text-slate-500">Live chat & dispute arbitration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
