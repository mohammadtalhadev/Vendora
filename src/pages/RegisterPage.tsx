import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  Check,
  Sparkles,
  ShoppingBag,
  Store,
  MapPin,
  Building2,
  FileText,
  Truck,
  RotateCcw,
  Headphones,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAuth } from '../lib/auth-context';
import { useCartStore } from '../store/cart-store';
import { submitVendorApplication } from '../features/vendor/api/applications';
import { resendSignupConfirmation, verifySignupOtp } from '../features/auth/api/session';
import { friendlyErrorText } from '../lib/friendly-error';
import { linkReferral } from '../features/rewards/api/rewards';
import { OtpInput } from '../components/ui/otp-input';

/**
 * Best-effort referral link: if the visitor arrived through a
 * referral link, the stored code is linked to the new account once a
 * session exists. A failure here must never break sign-up, and the stored
 * code is cleared either way so it cannot link a later, unrelated signup.
 */
async function linkStoredReferral(): Promise<void> {
  let code: string | null;
  try {
    code = localStorage.getItem('vendora_ref');
  } catch {
    return;
  }
  if (!code) return;
  try {
    await linkReferral(code);
  } catch {
    // Referral linking is best-effort; the account itself is already made.
  }
  try {
    localStorage.removeItem('vendora_ref');
  } catch {
    // Storage unavailable: nothing more to do.
  }
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signInWithProvider } = useAuth();
  const { mergeGuestCartIntoUser } = useCartStore();

  // A referral link lands here as ?ref=CODE: stash the code so it can be
  // linked after sign-up succeeds (there is no account to link before).
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      try {
        localStorage.setItem('vendora_ref', ref);
      } catch {
        // Storage unavailable: the referral simply is not carried.
      }
    }
  }, [searchParams]);

  // Active Role Toggle: 'customer' | 'seller'
  const [activeRole, setActiveRole] = useState<'customer' | 'seller'>('customer');

  // Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('Karachi');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerConfirmPassword, setCustomerConfirmPassword] = useState('');
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);
  const [showCustomerConfirmPassword, setShowCustomerConfirmPassword] = useState(false);
  const [customerAgreed, setCustomerAgreed] = useState(false);

  // Seller Form State
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [categoryFocus, setCategoryFocus] = useState('electronics');
  const [ownerName, setOwnerName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [taxNtn, setTaxNtn] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [sellerPassword, setSellerPassword] = useState('');
  const [sellerConfirmPassword, setSellerConfirmPassword] = useState('');
  const [showSellerPassword, setShowSellerPassword] = useState(false);
  const [showSellerConfirmPassword, setShowSellerConfirmPassword] = useState(false);
  const [sellerAgreed, setSellerAgreed] = useState(false);

  // Submission UI States
  const [error, setError] = useState<string | null>(null);
  // Set when sign-up succeeded but the account waits on email verification:
  // the page swaps the form for an unmistakable check-your-inbox panel
  // instead of a small dismissible notice.
  const [confirmation, setConfirmation] = useState<{ email: string; kind: 'customer' | 'seller' } | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResendConfirmation = async () => {
    if (!confirmation) return;
    setResendState('sending');
    setResendError(null);
    try {
      await resendSignupConfirmation(confirmation.email);
      setResendState('sent');
      setResendCooldown(60);
      setOtpCode('');
      setOtpError(null);
    } catch (err: unknown) {
      setResendError(friendlyErrorText(err, { context: 'auth' }));
      setResendState('error');
    }
  };

  // Email-code (OTP) verification state: the typed alternative to
  // clicking the confirmation link, for projects whose template sends one.
  const [otpCode, setOtpCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const coolingDown = resendCooldown > 0;
  useEffect(() => {
    if (!coolingDown) return;
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [coolingDown]);

  const handleVerifyOtp = async () => {
    if (!confirmation || otpCode.length !== 6 || otpVerifying) return;
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const user = await verifySignupOtp(confirmation.email, otpCode);
      await linkStoredReferral();
      if (confirmation.kind === 'seller') {
        navigate('/become-a-seller');
      } else {
        mergeGuestCartIntoUser(user.id);
        navigate('/');
      }
    } catch (err: unknown) {
      setOtpError(friendlyErrorText(err, { context: 'auth' }));
      setOtpVerifying(false);
    }
  };

  // Auto-slugify when store name changes
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStoreName(val);
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setStoreSlug(slug);
  };

  // Real-time password security score (1 - 4) for Customer
  const customerPasswordSecurity = useMemo(() => {
    if (!customerPassword) return { score: 0, label: 'Enter Password', color: 'bg-slate-200' };
    let score = 0;
    if (customerPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(customerPassword) && /[a-z]/.test(customerPassword)) score += 1;
    if (/[0-9]/.test(customerPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(customerPassword)) score += 1;
    if (score === 0 && customerPassword.length >= 6) score = 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-coral' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-lemon' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-aqua' };
    return { score: 4, label: 'Very Strong', color: 'bg-sun-orange' };
  }, [customerPassword]);

  // Real-time password security score for Seller
  const sellerPasswordSecurity = useMemo(() => {
    if (!sellerPassword) return { score: 0, label: 'Enter Password', color: 'bg-slate-200' };
    let score = 0;
    if (sellerPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(sellerPassword) && /[a-z]/.test(sellerPassword)) score += 1;
    if (/[0-9]/.test(sellerPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(sellerPassword)) score += 1;
    if (score === 0 && sellerPassword.length >= 6) score = 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-coral' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-lemon' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-aqua' };
    return { score: 4, label: 'Very Strong', color: 'bg-sun-orange' };
  }, [sellerPassword]);

  // Customer Form Submission -> Supabase Auth & Profile Sync
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Please provide your full name');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }
    if (customerPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (customerPassword !== customerConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!customerAgreed) {
      setError('You must accept the Vendora Customer Terms of Service');
      return;
    }

    setIsSubmitting(true);
    try {
      const { user } = await signUp(customerName.trim(), customerEmail.trim(), customerPassword);

      if (!user) {
        setConfirmation({ email: customerEmail.trim(), kind: 'customer' });
        setIsSubmitting(false);
        return;
      }

      await linkStoredReferral();
      mergeGuestCartIntoUser(user.id);
      navigate('/');
    } catch (err: unknown) {
      setError(friendlyErrorText(err, { context: 'auth' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Seller / Merchant Submission -> Supabase Auth & vendor_applications Table Sync
  const handleSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!storeName.trim()) {
      setError('Please provide your store / brand name');
      return;
    }
    if (!storeSlug.trim()) {
      setError('Please provide a custom store slug URL');
      return;
    }
    if (!ownerName.trim()) {
      setError('Please provide the business owner / representative name');
      return;
    }
    if (!businessEmail.trim() || !businessEmail.includes('@')) {
      setError('Please provide a valid official business email');
      return;
    }
    if (sellerPassword.length < 8) {
      setError('Portal password must be at least 8 characters');
      return;
    }
    if (sellerPassword !== sellerConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!sellerAgreed) {
      setError('You must accept the Vendora Merchant Agreement & Code of Conduct');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the merchant user account in Supabase
      const { user } = await signUp(ownerName.trim(), businessEmail.trim(), sellerPassword);

      // 2. Submit the vendor application to the database table
      await submitVendorApplication({
        proposedStoreName: storeName.trim(),
        proposedSlug: storeSlug.trim(),
        description: storeDescription.trim(),
        businessType: categoryFocus,
        contactEmail: businessEmail.trim(),
        contactPhone: businessPhone.trim() || undefined,
        kycDocuments: {
          taxNtn: taxNtn.trim(),
          representative: ownerName.trim(),
        },
      }, user?.id);

      if (!user) {
        setConfirmation({ email: businessEmail.trim(), kind: 'seller' });
        setIsSubmitting(false);
        return;
      }

      await linkStoredReferral();
      navigate('/become-a-seller');
    } catch (err: unknown) {
      setError(friendlyErrorText(err, { context: 'auth' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignUp = async (provider: 'google' | 'apple') => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithProvider(provider);
    } catch (err: unknown) {
      const message = friendlyErrorText(err, { context: 'auth' });
      setError(message);
      setIsSubmitting(false);
    }
  };

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
            <span className="font-semibold text-slate-900 dark:text-white">Register</span>
          </div>
          <Link
            to="/login"
            className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-sun-orange hover:text-sun-orange-600 transition-colors group"
          >
            <span>Already have an account? Sign In</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* =========================================================================
            2. Main Glassmorphism Registration Card
           ========================================================================= */}
        <div className="relative w-full rounded-3xl overflow-hidden backdrop-blur-xl [backdrop-filter:blur(24px)_saturate(160%)] bg-white/80 dark:bg-slate-900/80 border border-white/90 dark:border-white/10 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.08)]">
          <div className="relative grid grid-cols-1 lg:grid-cols-12 min-h-[720px]">
            {/* =========================================================================
                MAIN FORM COLUMN (7 Cols — same split as the sign-in card)
               ========================================================================= */}
            <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 flex flex-col justify-between">
              <div>
                {/* Header: Vendora Brand Identity & Global Switch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-7 border-b border-slate-100/80 dark:border-white/10">
                  <div className="flex items-center gap-3.5">
                    <div>
                      <div className="flex items-baseline">
                        <span className="font-outfit font-black text-2xl tracking-tight text-slate-900 dark:text-white leading-none">
                          Vendora
                        </span>
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-sun-orange ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Auth Mode Pill */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="p-1 rounded-full bg-slate-200/50 dark:bg-white/10 border border-white/60 dark:border-white/10 flex items-center shadow-inner">
                      <Link
                        to="/login"
                        className="px-5 py-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-outfit font-semibold text-sm transition-all"
                      >
                        Sign In
                      </Link>
                      <span className="px-5 py-2 rounded-full bg-sun-orange text-white font-outfit font-semibold text-sm shadow-[0_4px_14px_color-mix(in_srgb,var(--color-sun-orange)_32%,transparent)] transition-all">
                        Register
                      </span>
                    </div>
                  </div>
                </div>

                {/* Headline & Escrow Protection Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-6 mb-6">
                  <div>
                    <h1 className="font-outfit text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Create an Account
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Select your account tier to begin transacting with verified buyer protections.
                    </p>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div
                    role="alert"
                    className="mb-5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 p-3.5 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center justify-between backdrop-blur-md animate-in fade-in"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
                      {error}
                    </span>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      aria-label="Dismiss error"
                      className="text-rose-500 hover:text-rose-700 ml-2 cursor-pointer shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Confirmation Panel — replaces the form once a sign-up is
                    waiting on email verification, so the "we emailed you"
                    state cannot be missed or dismissed by accident. */}
                {confirmation && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mb-7 rounded-3xl border border-sun-orange/30 bg-sun-orange-50/80 dark:bg-orange-950/30 p-6 sm:p-8 text-center animate-in fade-in"
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sun-orange text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--color-sun-orange)_35%,transparent)]">
                      <Mail className="h-7 w-7" />
                    </div>
                    <h2 className="font-outfit text-2xl font-bold text-slate-900 dark:text-white">
                      Check your inbox to finish
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      We sent a confirmation email with a 6-digit code to{' '}
                      <span className="font-bold text-slate-900 dark:text-white">{confirmation.email}</span>. Enter
                      the code below to{' '}
                      {confirmation.kind === 'seller'
                        ? 'activate your account — your merchant application has been received and is queued for review.'
                        : 'activate your account and sign in right away.'}{' '}
                      Prefer links? The same email also carries a verification link.
                    </p>
                    <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      No email after a few minutes? Check your spam or junk folder — and note the code expires, so
                      use the newest email if you resend.
                    </p>

                    {/* Email-code (OTP) entry — the typed path to the same
                        verification the link performs. */}
                    <div className="mt-6">
                      <span className="mb-2.5 block text-[11px] font-black text-slate-500 dark:text-slate-400">
                        Enter the 6-digit code
                      </span>
                      <OtpInput
                        value={otpCode}
                        onChange={(next) => {
                          setOtpCode(next);
                          setOtpError(null);
                        }}
                        disabled={otpVerifying}
                      />
                      {otpError && (
                        <p role="alert" className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {otpError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpCode.length !== 6 || otpVerifying}
                        className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-sun-orange px-6 py-2.5 font-outfit text-xs font-bold text-white transition-all hover:bg-[#E63E00] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {otpVerifying ? 'Verifying...' : 'Verify & activate account'}
                      </button>
                    </div>

                    {resendState === 'sent' ? (
                      <div className="mt-5">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          A new confirmation email is on its way to {confirmation.email}.
                        </p>
                        {resendCooldown > 0 ? (
                          <p className="mt-2 text-[11px] font-semibold text-slate-400">
                            You can request another code in {resendCooldown}s.
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendConfirmation}
                            className="mt-2 cursor-pointer text-[11px] font-bold text-sun-orange underline"
                          >
                            Resend again
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendState === 'sending'}
                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-sun-orange bg-white/70 px-5 py-2.5 font-outfit text-xs font-bold text-sun-orange transition-all hover:bg-white disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {resendState === 'sending' ? 'Resending...' : 'Resend confirmation email'}
                      </button>
                    )}
                    {resendState === 'error' && resendError && (
                      <p role="alert" className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        {resendError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmation(null);
                        setResendState('idle');
                        setResendError(null);
                        setOtpCode('');
                        setOtpError(null);
                        setResendCooldown(0);
                      }}
                      className="mx-auto mt-4 block text-xs font-semibold text-slate-500 underline transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                    >
                      Wrong address? Go back and fix it
                    </button>
                  </div>
                )}

                {/* =========================================================================
                    INTERACTIVE TWO-ROLE SWITCHER CARDS
                   ========================================================================= */}
                {!confirmation && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-7">
                  {/* Customer Card */}
                  <button
                    type="button"
                    onClick={() => setActiveRole('customer')}
                    aria-pressed={activeRole === 'customer'}
                    className={`role-card text-left p-4 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden group cursor-pointer ${
                      activeRole === 'customer'
                        ? 'bg-sun-orange-50 dark:bg-orange-950/20 border-sun-orange shadow-xs'
                        : 'bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-orange-500/10 flex items-center justify-center text-sun-orange">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-outfit font-bold text-base leading-snug text-slate-900 dark:text-white">Customer (Shopper)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Personal buying account</p>
                      </div>
                      <div
                        className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center transition-all ${
                          activeRole === 'customer'
                            ? 'bg-sun-orange text-white shadow-2xs'
                            : 'bg-slate-200 dark:bg-white/10 text-transparent'
                        }`}
                      >
                        <Check className={`h-3 w-3 stroke-[3] ${activeRole === 'customer' ? 'opacity-100' : 'opacity-0'}`} />
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mt-2">
                      Access verified Pakistani brands with doorstep cash-on-delivery and escrow buyer protection.
                    </p>
                    <span className="mt-3 inline-flex px-2 py-0.5 rounded-full text-[11px] font-outfit font-semibold bg-orange-100 dark:bg-orange-900/40 text-sun-orange">
                      Shop & Save
                    </span>
                  </button>

                  {/* Seller Card */}
                  <button
                    type="button"
                    onClick={() => setActiveRole('seller')}
                    aria-pressed={activeRole === 'seller'}
                    className={`role-card text-left p-4 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden group cursor-pointer ${
                      activeRole === 'seller'
                        ? 'bg-sun-orange-50 dark:bg-orange-950/20 border-sun-orange shadow-xs'
                        : 'bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-aqua/10 flex items-center justify-center text-aqua">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-outfit font-bold text-base leading-snug text-slate-900 dark:text-white">Seller (Merchant Store)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Commercial vendor portal</p>
                      </div>
                      <div
                        className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center transition-all ${
                          activeRole === 'seller'
                            ? 'bg-sun-orange text-white shadow-2xs'
                            : 'bg-slate-200 dark:bg-white/10 text-transparent'
                        }`}
                      >
                        <Check className={`h-3 w-3 stroke-[3] ${activeRole === 'seller' ? 'opacity-100' : 'opacity-0'}`} />
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mt-2">
                      0% introductory commission, dedicated brand storefront, nationwide automated courier pickups.
                    </p>
                    <span className="mt-3 inline-flex px-2 py-0.5 rounded-full text-[11px] font-outfit font-semibold bg-cyan-100 dark:bg-cyan-900/40 text-aqua">
                      Sell & Grow
                    </span>
                  </button>
                </div>
                )}

                {/* =========================================================================
                    FORM 1: CUSTOMER (SHOPPER) FORM
                   ========================================================================= */}
                {!confirmation && activeRole === 'customer' && (
                  <form onSubmit={handleCustomerSubmit} className="space-y-4">
                    {/* Full Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="customerName" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Full Name
                        </label>
                        <div className="relative flex items-center">
                          <User className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="customerName"
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="e.g. Ayesha Khan"
                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="customerEmail" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Personal Email Address
                        </label>
                        <div className="relative flex items-center">
                          <Mail className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="customerEmail"
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="ayesha@example.com"
                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phone (+92) & City Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="customerPhone" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Mobile Phone
                        </label>
                        <div className="flex gap-2">
                          <div className="relative rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3.5 h-12 flex items-center justify-center shadow-2xs">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">+92</span>
                          </div>
                          <div className="relative flex-1 flex items-center">
                            <input
                              id="customerPhone"
                              type="tel"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              placeholder="300 1234567"
                              className="w-full h-12 px-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="customerCity" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Delivery City / Region
                        </label>
                        <div className="relative flex items-center">
                          <MapPin className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <Select value={customerCity} onValueChange={setCustomerCity}>
                            <SelectTrigger
                              id="customerCity"
                              aria-label="Delivery City / Region"
                              className="h-12 rounded-2xl border-slate-200 bg-white/70 pl-12 pr-4 text-sm text-slate-900 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-white"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Karachi">Karachi</SelectItem>
                              <SelectItem value="Lahore">Lahore</SelectItem>
                              <SelectItem value="Islamabad">Islamabad</SelectItem>
                              <SelectItem value="Rawalpindi">Rawalpindi</SelectItem>
                              <SelectItem value="Faisalabad">Faisalabad</SelectItem>
                              <SelectItem value="Multan">Multan</SelectItem>
                              <SelectItem value="Peshawar">Peshawar</SelectItem>
                              <SelectItem value="Quetta">Quetta</SelectItem>
                              <SelectItem value="Other">Other Cities (Nationwide)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="customerPassword" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Password
                        </label>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="customerPassword"
                            type={showCustomerPassword ? 'text' : 'password'}
                            value={customerPassword}
                            onChange={(e) => setCustomerPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCustomerPassword(!showCustomerPassword)}
                            aria-label={showCustomerPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            {showCustomerPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>

                        {/* Security Meter — bars only in the bar row; the
                            label is a separate caption row beneath it */}
                        <div className="pt-1">
                          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`h-1 rounded-full transition-colors duration-300 ${
                                  customerPasswordSecurity.score >= step
                                    ? customerPasswordSecurity.color
                                    : 'bg-slate-200 dark:bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="mt-2 flex justify-between items-center text-[11px] text-slate-400 font-medium">
                            <span>Strength:</span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              {customerPasswordSecurity.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="customerConfirmPassword" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Confirm Password
                        </label>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="customerConfirmPassword"
                            type={showCustomerConfirmPassword ? 'text' : 'password'}
                            value={customerConfirmPassword}
                            onChange={(e) => setCustomerConfirmPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCustomerConfirmPassword(!showCustomerConfirmPassword)}
                            aria-label={showCustomerConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            className="absolute right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            {showCustomerConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 pt-1">Must match the password entered above.</p>
                      </div>
                    </div>

                    {/* Terms Checkbox */}
                    <div className="pt-2">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={customerAgreed}
                          onChange={(e) => setCustomerAgreed(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shadow-2xs mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-sun-orange/40 ${
                            customerAgreed
                              ? 'border-sun-orange bg-sun-orange text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {customerAgreed && <Check className="h-3 w-3 text-white stroke-[3]" />}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
                          I agree to the{' '}
                          <Link to="/terms" className="text-sun-orange font-semibold hover:underline">
                            Vendora Customer Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link to="/privacy" className="text-sun-orange font-semibold hover:underline">
                            Vault Privacy Standard
                          </Link>
                          .
                        </span>
                      </label>
                    </div>

                    {/* Customer Submit CTA */}
                    <div className="pt-3">
                      <Button type="submit" variant="default" size="lg" disabled={isSubmitting || !customerAgreed} className="w-full">
                        <span>{isSubmitting ? 'Creating account...' : 'Create Customer Account'}</span>
                        <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                      </Button>
                    </div>

                    {/* Social Registration */}
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/10">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleSocialSignUp('google')}
                          disabled={isSubmitting}
                          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-800 dark:text-slate-100 transition-all shadow-xs group cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                          </svg>
                          <span className="font-outfit text-xs font-bold text-slate-800 dark:text-slate-100">Google</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSocialSignUp('apple')}
                          disabled={isSubmitting}
                          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-800 dark:text-slate-100 transition-all shadow-xs group cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-4 h-4 fill-slate-900 dark:fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.96.04-2.13.64-2.79 1.41-.57.66-1.07 1.74-1.02 2.8.99.08 2.18-.58 2.8-1.34z" />
                          </svg>
                          <span className="font-outfit text-xs font-bold text-slate-800 dark:text-slate-100">Apple ID</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* =========================================================================
                    FORM 2: SELLER (MERCHANT STORE) FORM
                   ========================================================================= */}
                {!confirmation && activeRole === 'seller' && (
                  <form onSubmit={handleSellerSubmit} className="space-y-4">
                    {/* Store Name & Slug */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="storeName" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Store / Brand Name
                        </label>
                        <div className="relative flex items-center">
                          <Store className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="storeName"
                            type="text"
                            value={storeName}
                            onChange={handleStoreNameChange}
                            placeholder="e.g. Khaadi Studio or Volt Audio PK"
                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="storeSlug" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Custom Store Slug URL
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-xs text-slate-400 font-mono pointer-events-none">/vendors/</span>
                          <input
                            id="storeSlug"
                            type="text"
                            value={storeSlug}
                            onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="brand-slug"
                            className="w-full h-12 pl-[92px] pr-4 rounded-2xl bg-white/70 dark:bg-white/5 text-sm text-sun-orange font-semibold placeholder:text-slate-400 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Category & Legal Representative */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="categoryFocus" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Primary Business Category
                        </label>
                        <div className="relative flex items-center">
                          <Building2 className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <Select value={categoryFocus} onValueChange={setCategoryFocus}>
                            <SelectTrigger
                              id="categoryFocus"
                              aria-label="Primary Business Category"
                              className="h-12 rounded-2xl border-slate-200 bg-white/70 pl-12 pr-4 text-sm text-slate-900 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-white"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="electronics">Electronics &amp; Gadgets</SelectItem>
                              <SelectItem value="fashion">Fashion &amp; Apparel</SelectItem>
                              <SelectItem value="beauty">Beauty &amp; Personal Care</SelectItem>
                              <SelectItem value="home">Home &amp; Living</SelectItem>
                              <SelectItem value="health">Health &amp; Nutrition</SelectItem>
                              <SelectItem value="computing">Computers &amp; Audio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="ownerName" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Merchant Owner / Legal Rep
                        </label>
                        <div className="relative flex items-center">
                          <User className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="ownerName"
                            type="text"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            placeholder="Authorized Representative Name"
                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Business Email & WhatsApp */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="businessEmail" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Official Business Email
                        </label>
                        <div className="relative flex items-center">
                          <Mail className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="businessEmail"
                            type="email"
                            value={businessEmail}
                            onChange={(e) => setBusinessEmail(e.target.value)}
                            placeholder="sales@yourbrand.pk"
                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="businessPhone" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Business WhatsApp / Support
                        </label>
                        <div className="flex gap-2">
                          <div className="relative rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3.5 h-12 flex items-center justify-center shadow-2xs">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">+92</span>
                          </div>
                          <div className="relative flex-1 flex items-center">
                            <input
                              id="businessPhone"
                              type="tel"
                              value={businessPhone}
                              onChange={(e) => setBusinessPhone(e.target.value)}
                              placeholder="321 9876543"
                              className="w-full h-12 px-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tax NTN & Short Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="taxNtn" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Tax NTN / CNIC Number <span className="text-[10px] text-slate-400 lowercase">(for verified payouts)</span>
                        </label>
                        <div className="relative flex items-center">
                          <Building2 className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="taxNtn"
                            type="text"
                            value={taxNtn}
                            onChange={(e) => setTaxNtn(e.target.value)}
                            placeholder="e.g. 42101-XXXXXXX-X or NTN"
                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="storeDescription" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Short Store Description
                        </label>
                        <div className="relative flex items-center">
                          <FileText className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="storeDescription"
                            type="text"
                            value={storeDescription}
                            onChange={(e) => setStoreDescription(e.target.value)}
                            placeholder="Key product categories, brand heritage..."
                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password & Confirm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="sellerPassword" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Merchant Portal Password
                        </label>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="sellerPassword"
                            type={showSellerPassword ? 'text' : 'password'}
                            value={sellerPassword}
                            onChange={(e) => setSellerPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowSellerPassword(!showSellerPassword)}
                            aria-label={showSellerPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            {showSellerPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {/* Security Meter — same structure as the customer
                            form: bars only in the bar row, label caption below */}
                        <div className="pt-1">
                          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`h-1 rounded-full transition-colors duration-300 ${
                                  sellerPasswordSecurity.score >= step
                                    ? sellerPasswordSecurity.color
                                    : 'bg-slate-200 dark:bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="mt-2 flex justify-between items-center text-[11px] text-slate-400 font-medium">
                            <span>Strength:</span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              {sellerPasswordSecurity.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="sellerConfirmPassword" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Confirm Password
                        </label>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-4 text-slate-400 h-5 w-5 pointer-events-none" />
                          <input
                            id="sellerConfirmPassword"
                            type={showSellerConfirmPassword ? 'text' : 'password'}
                            value={sellerConfirmPassword}
                            onChange={(e) => setSellerConfirmPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-sun-orange/30 focus:border-sun-orange shadow-2xs transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowSellerConfirmPassword(!showSellerConfirmPassword)}
                            aria-label={showSellerConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            className="absolute right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            {showSellerConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 pt-1">Must match the password entered above.</p>
                      </div>
                    </div>

                    {/* Merchant Terms */}
                    <div className="pt-2">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sellerAgreed}
                          onChange={(e) => setSellerAgreed(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shadow-2xs mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-sun-orange/40 ${
                            sellerAgreed
                              ? 'border-sun-orange bg-sun-orange text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {sellerAgreed && <Check className="h-3 w-3 text-white stroke-[3]" />}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
                          I agree to the{' '}
                          <Link to="/become-a-seller" className="text-sun-orange font-semibold hover:underline">
                            Vendora Merchant Agreement
                          </Link>
                          , <span className="font-semibold text-slate-800 dark:text-white">0% Take Rate Terms</span>, and{' '}
                          <Link to="/terms" className="text-sun-orange font-semibold hover:underline">
                            Code of Conduct
                          </Link>
                          .
                        </span>
                      </label>
                    </div>

                    {/* Seller Submit CTA */}
                    <div className="pt-3">
                      <Button type="submit" variant="default" size="lg" disabled={isSubmitting || !sellerAgreed} className="w-full">
                        <span>{isSubmitting ? 'Submitting Application...' : 'Submit Merchant Application'}</span>
                        <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Bottom Redirection Link */}
              <div className="pt-6 mt-4 border-t border-slate-100 dark:border-white/10 text-center sm:text-left">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Already have a Vendora account?
                  <Link
                    to="/login"
                    className="text-sun-orange font-bold hover:text-sun-orange-600 transition-colors ml-1 inline-flex items-center gap-0.5"
                  >
                    Sign In
                    <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                  </Link>
                </p>
              </div>
            </div>

            {/* =========================================================================
                LATERAL COLUMN: Dynamic Perks & Privileges (4 Cols)
               ========================================================================= */}
            <div className="lg:col-span-5 bg-slate-50/70 dark:bg-white/[0.02] border-t lg:border-t-0 lg:border-l border-slate-200/70 dark:border-white/10 backdrop-blur-2xl p-8 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-sun-orange-200/35 blur-[75px] pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-aqua-100/40 blur-[70px] pointer-events-none" />

              <div className="relative z-10">
                {/* Dynamic Role Header */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 shadow-2xs mb-3">
                    <span className="font-outfit font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      {activeRole === 'customer' ? 'Shopper Privileges' : 'Merchant Privileges'}
                    </span>
                  </div>
                  <h2 className="font-outfit font-bold text-xl text-slate-900 dark:text-white tracking-tight">
                    {activeRole === 'customer' ? 'Unlocked for Shoppers' : 'Unlocked for Merchants'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {activeRole === 'customer'
                      ? 'Every customer receives verified protection on every order.'
                      : "Join 500+ verified Pakistani retailers scaling on Vendora's infrastructure."}
                  </p>
                </div>

                {/* Dynamic Perks Cards */}
                <div className="space-y-3.5">
                  {activeRole === 'customer' ? (
                    <>
                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white dark:border-white/10 shadow-2xs hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-100/80 dark:bg-orange-950/40 flex items-center justify-center text-sun-orange shrink-0 mt-0.5">
                            <Shield className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                              100% Escrow Buyer Protection
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              Funds released to sellers only after you inspect and accept your delivery.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white dark:border-white/10 shadow-2xs hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-cyan-100/80 dark:bg-cyan-950/40 flex items-center justify-center text-aqua shrink-0 mt-0.5">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                              24–48h Express Nationwide Dispatch
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              Priority express couriers in Karachi, Lahore, and Islamabad with live rider tracking.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white dark:border-white/10 shadow-2xs hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100/80 dark:bg-yellow-950/40 flex items-center justify-center text-[#CA8A04] dark:text-yellow-400 shrink-0 mt-0.5">
                            <RotateCcw className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                              Easy 30-Day Doorstep Returns
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              Free courier pickup from your doorstep if items don't match expectations.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white dark:border-white/10 shadow-2xs hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-100/80 dark:bg-rose-950/40 flex items-center justify-center text-coral shrink-0 mt-0.5">
                            <Headphones className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                              24/7 Customer Support
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              Live chat help for orders, returns and disputes.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white dark:border-white/10 shadow-2xs hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-100/80 dark:bg-orange-950/40 flex items-center justify-center text-sun-orange shrink-0 mt-0.5">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                              0% Take Rate / 90 Days
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              Keep 100% of your initial GMV sales with zero platform commission fee.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white dark:border-white/10 shadow-2xs hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-cyan-100/80 dark:bg-cyan-950/40 flex items-center justify-center text-aqua shrink-0 mt-0.5">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                              Weekly Automated Bank Payouts
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              Guaranteed weekly IBFT bank transfers directly to your verified business account.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white dark:border-white/10 shadow-2xs hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100/80 dark:bg-yellow-950/40 flex items-center justify-center text-[#CA8A04] dark:text-yellow-400 shrink-0 mt-0.5">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                              Dedicated Storefront & Custom URL
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              Branded digital boutique with live inventory sync and discount coupon tools.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white dark:border-white/10 shadow-2xs hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-100/80 dark:bg-rose-950/40 flex items-center justify-center text-coral shrink-0 mt-0.5">
                            <Shield className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white">
                              Escrow Fraud & Chargeback Shield
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              Eliminate return fraud with mandatory 4-digit buyer delivery OTP verification.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
