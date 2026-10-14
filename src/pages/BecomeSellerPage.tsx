import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Truck,
  Package,
  Award,
  Zap,
  AlertOctagon,
  Building2,
  Download,
  Check,
  Sparkles,
  Calculator,
  Clock,
  Camera,
  MessageSquare,
  CheckCircle2,
  RotateCcw,
  DollarSign,
  Users,
} from 'lucide-react';
import { useCurrency } from '../store/currency-store';
import { useAuthStore } from '../store/auth-store';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  SellerApplicationForm,
  ApplicationPendingCard,
} from '../features/vendor/components/SellerApplicationForm';

export const BecomeSellerPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [monthlySales, setMonthlySales] = useState(350000);

  // Merchant application status (Supabase-authoritative profile mirrored in the auth store).
  const vendorStatus = user?.vendorStatus ?? 'none';
  const rejectionReason =
    user?.rejectionReason ??
    'No reason for the decision was recorded. Please review the Merchant Agreement and re-apply with corrected business details.';

  const handleReapply = () => {
    if (user) {
      setUser({ ...user, vendorStatus: 'none' });
    }
  };

  // Platform commission calculation
  const platformFeePercent = 3.2;
  const platformFee = Math.round((monthlySales * platformFeePercent) / 100);
  const netTakeHome = monthlySales - platformFee;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-slate-950 font-sans selection:bg-sun-orange/20 selection:text-sun-orange text-slate-800 dark:text-slate-100 antialiased overflow-hidden pb-24">
      {/* Radiant ambient glow orbs (Matching Homepage & Storefront) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-sun-orange-200/65 via-sun-orange-100/70 to-sun-orange-200/40 blur-[130px] dark:from-sun-orange/10 dark:via-sun-orange-200/5 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-aqua-100/70 via-[#F1F5F9]/80 to-sun-orange-100/50 blur-[140px] dark:from-aqua/10 dark:via-transparent pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-sun-orange-100/70 via-aqua-100/50 to-[#F1F5F9] blur-[130px] dark:from-sun-orange/5 pointer-events-none" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 space-y-16">
        {/* ========================================================================= */}
        {/* 1. Hero Section & Value Propositions                                      */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-3xl space-y-5 rounded-[32px] border border-white/80 bg-white/70 px-6 py-10 text-center shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 sm:px-10">
          <Badge variant="vendora-platform">Become a Seller</Badge>
          <h1 className="font-outfit text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Transparent Pricing. Fair Growth.{' '}
            <span className="bg-gradient-to-r from-sun-orange to-rose-600 bg-clip-text text-transparent">
              Zero Hidden Fees.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Join the verified Pakistani merchants selling on Vendora — category commission published up front, a dispute desk that protects both sides of every order, and payouts to your bank account on a weekly cycle.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:ring-slate-700">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Published fee schedule
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:ring-slate-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Dispute desk on every order
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:ring-slate-700">
              <Clock className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Weekly payouts
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1b. Three Core Seller Benefits                                            */}
        {/* ========================================================================= */}
        <section className="mt-16" aria-label="Seller Benefits">
          <div className="text-center mb-8">
            <Badge variant="vendora-platform" className="mb-2">Why Sell on Vendora</Badge>
            <h2 className="font-outfit text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Built for Merchant Growth and Transparency
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-sun-orange mb-4">
                <DollarSign className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="vendora-platform" size="sm">5% – 8% Rate</Badge>
                <span className="text-xs font-semibold text-emerald-600">Keep 92-95%</span>
              </div>
              <h3 className="font-outfit text-lg font-bold text-slate-900 dark:text-white">
                Industry-Low Commission
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Stop paying 15% to 20% on traditional marketplaces. Vendora charges transparent 5–8% category fees with zero hidden listing charges or mandatory ad fees.
              </p>
            </div>

            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-950/40 text-aqua mb-4">
                <Zap className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="vendor-verified" size="sm">Automated Split</Badge>
                <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">Instant &amp; Weekly</span>
              </div>
              <h3 className="font-outfit text-lg font-bold text-slate-900 dark:text-white">
                Instant Split Payouts
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                When a buyer places a multi-vendor order, customer funds are split automatically. Frozen fee deductions protect your net earnings, deposited weekly or instantly.
              </p>
            </div>

            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 mb-4">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="secondary" size="sm">Growing Marketplace</Badge>
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">High-Intent Traffic</span>
              </div>
              <h3 className="font-outfit text-lg font-bold text-slate-900 dark:text-white">
                Massive Platform Reach
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Gain instant access to a growing marketplace of active technology, design, and physical product shoppers with built-in search optimization and storefront sharing.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 1c. Dynamic Onboarding / Status Decision Engine                           */}
        {/* ========================================================================= */}
        <section
          className="mt-16 w-full"
          role="status"
          aria-label="Merchant application status"
        >
          {/* State A: Already Approved Vendor */}
          {vendorStatus === 'approved' && (
            <div
              data-testid="approved-vendor-status"
              className="mx-auto w-full max-w-2xl rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 text-center shadow-lg sm:p-8"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 mb-4">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </div>

              <Badge variant="vendor-verified" size="lg" className="mb-2">Already Approved</Badge>

              <h2 className="font-outfit text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
                Already Approved
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
                Your merchant account is active and verified! You already have full access to manage your products, track orders, view analytics, and customize your storefront.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/vendor">
                  <Button variant="orange-cta" size="lg" className="font-bold">
                    <span>Go to Vendor Dashboard</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
                {user?.vendorId && (
                  <Link to={`/vendors/${user.vendorId}`}>
                    <Button variant="outline" size="lg">
                      <span>View Public Storefront</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* State B: Application Under Review (Pending) */}
          {vendorStatus === 'pending' && (
            <div data-testid="pending-vendor-status" className="mx-auto w-full max-w-2xl">
              <ApplicationPendingCard
                businessName={user?.name}
                estimatedTime="24–48 business hours"
              />
              <div className="mt-4 text-center">
                <Link to="/seller-application">
                  <Button variant="outline" size="lg" className="font-bold">
                    <span>Track your application</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* State C: Application Rejected */}
          {vendorStatus === 'rejected' && (
            <div
              data-testid="rejected-vendor-status"
              className="mx-auto w-full max-w-2xl rounded-3xl border border-rose-200 dark:border-rose-900/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 text-center shadow-lg sm:p-8"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 mb-4">
                <AlertOctagon className="h-8 w-8" aria-hidden="true" />
              </div>

              <Badge variant="discount-coral" size="lg" className="mb-2">Application Notice</Badge>

              <h2 className="font-outfit text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
                Application Not Approved
              </h2>

              <div className="mx-auto mt-4 max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/30 p-4 text-left">
                <div className="text-xs font-semibold text-rose-900 dark:text-rose-200 mb-1">
                  Reason for Decision:
                </div>
                <p
                  data-testid="rejection-reason"
                  className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed"
                >
                  {rejectionReason}
                </p>
              </div>

              <p className="mx-auto mt-4 max-w-md text-xs text-slate-500 dark:text-slate-400">
                You can update your business information, correct store details, and submit a new application for review.
              </p>

              <div className="mt-6 flex justify-center">
                <Button variant="orange-cta" size="lg" onClick={handleReapply} className="font-bold">
                  <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
                  <span>Re-apply</span>
                </Button>
              </div>
            </div>
          )}

          {/* State D: New Applicant (renders SellerApplicationForm inline) */}
          {vendorStatus !== 'approved' &&
            vendorStatus !== 'pending' &&
            vendorStatus !== 'rejected' && (
              <SellerApplicationForm />
            )}
        </section>

        {/* ========================================================================= */}
        {/* 2. Official Category Commission Schedule & Simulator                      */}
        {/* ========================================================================= */}
        <div className="mt-16 rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sun-orange">
                Tiered Commission Structure
              </span>
              <h2 className="font-outfit text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                Official Category Commission Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Compare Vendora's rates against legacy marketplaces in Pakistan. The live, binding schedule is published on the{' '}
                <Link to="/seller-fees" className="font-bold text-sun-orange hover:underline">
                  Seller Fees
                </Link>{' '}
                page.
              </p>
            </div>

            {/* Earnings Simulator Box */}
            <div className="rounded-2xl border border-orange-200/80 bg-orange-50/70 dark:border-orange-900/40 dark:bg-orange-950/30 p-4 lg:w-96 shrink-0 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-outfit text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5 text-sun-orange" aria-hidden="true" />
                  Earnings Simulator
                </span>
                <span className="text-xs text-slate-500 font-mono">Real-Time Estimator</span>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="monthly-sales"
                  className="block text-xs font-bold text-slate-500"
                >
                  Monthly Sales
                </label>
                <input
                  id="monthly-sales"
                  type="number"
                  value={monthlySales}
                  onChange={(e) => setMonthlySales(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden"
                />
                <p className="text-xs text-slate-500">
                  Entered in the platform&apos;s base unit; shown in your selected currency.
                </p>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Est. Net Take-Home (IBFT Payout):</span>
                  <span className="font-outfit text-sm font-black text-rose-600 dark:text-rose-400">
                    {formatPrice(netTakeHome)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>Applied Platform Fee ({platformFeePercent}%):</span>
                  <span>{formatPrice(platformFee)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table of Commission Rates */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold text-xs">
                  <th className="py-3 px-4">Product Category</th>
                  <th className="py-3 px-4">Standard Commission</th>
                  <th className="py-3 px-4">Gateway Fee</th>
                  <th className="py-3 px-4">Payout Cadence</th>
                  <th className="py-3 px-4 text-right">Industry Benchmark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {/* Row 1 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40 backdrop-blur-md text-sun-orange flex items-center justify-center shrink-0 shadow-2xs">
                      <Zap className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                    </div>
                    <div>
                      <div>Electronics &amp; Audio</div>
                      <span className="text-xs font-normal text-slate-500">Phones, TWS, Home Audio, Components</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">5.5%</td>
                  <td className="py-4 px-4 text-slate-500">0% Standard (Absorbed)</td>
                  <td className="py-4 px-4 font-semibold text-purple-600">Every Monday</td>
                  <td className="py-4 px-4 text-right text-slate-400 font-mono">12% – 15%</td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/40 backdrop-blur-md text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div>Fashion, Apparel &amp; Leather</div>
                      <span className="text-xs font-normal text-slate-500">Fabricated Lawn, Footwear, Handcrafted Leather</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">7.0%</td>
                  <td className="py-4 px-4 text-slate-500">0% Standard (Absorbed)</td>
                  <td className="py-4 px-4 font-semibold text-purple-600">Every Monday</td>
                  <td className="py-4 px-4 text-right text-slate-400 font-mono">15% – 20%</td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 backdrop-blur-md text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                      <Award className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div>Beauty, Skincare &amp; Wellness</div>
                      <span className="text-xs font-normal text-slate-500">Organic Serums, Dermatics, Scents</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">4.5%</td>
                  <td className="py-4 px-4 text-slate-500">0% Standard (Absorbed)</td>
                  <td className="py-4 px-4 font-semibold text-purple-600">Every Monday</td>
                  <td className="py-4 px-4 text-right text-slate-400 font-mono">14% – 18%</td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 backdrop-blur-md text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                      <Package className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div>Home, Kitchen &amp; Artisanal Decor</div>
                      <span className="text-xs font-normal text-slate-500">Blue Pottery Multan, Brass, Crockery</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">4.0%</td>
                  <td className="py-4 px-4 text-slate-500">0% Standard (Absorbed)</td>
                  <td className="py-4 px-4 font-semibold text-purple-600">Every Monday</td>
                  <td className="py-4 px-4 text-right text-slate-400 font-mono">10% – 15%</td>
                </tr>

                {/* Row 5 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/40 backdrop-blur-md text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div>Digital Downloads &amp; Software</div>
                      <span className="text-xs font-normal text-slate-500">Templates, Fonts, Licensed Utility Apps</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">4.0%</td>
                  <td className="py-4 px-4 text-slate-500">0% Standard (Absorbed)</td>
                  <td className="py-4 px-4 font-semibold text-purple-600">Every Monday</td>
                  <td className="py-4 px-4 text-right text-slate-400 font-mono">15% – 25%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. Payment Protection & Payouts (3 Big Cards)                              */}
        {/* ========================================================================= */}
        <div className="mt-16 space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-sun-orange">
              How Payouts Work
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Payment Protection &amp; Payouts
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              From checkout to settlement, every package follows the same published rules — commission frozen at order time, disputes handled by the desk, settled balances paid out weekly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Step 01 */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <span aria-hidden="true" className="absolute -bottom-4 -right-2 font-outfit text-8xl font-black text-slate-100 dark:text-slate-800/40 pointer-events-none select-none">
                01
              </span>
              <div className="space-y-4 relative z-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40 backdrop-blur-md text-sun-orange shadow-2xs">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sun-orange">
                    Step 01 • Order Placed
                  </span>
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Commission Frozen at Checkout
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  When a buyer checks out, the order records the price, the published category commission and your net for every package. Those figures never change afterwards — what you saw at order time is what settles.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 relative z-10">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Figures locked on the order record
                </span>
              </div>
            </div>

            {/* Step 02 */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <span aria-hidden="true" className="absolute -bottom-4 -right-2 font-outfit text-8xl font-black text-slate-100 dark:text-slate-800/40 pointer-events-none select-none">
                02
              </span>
              <div className="space-y-4 relative z-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/40 backdrop-blur-md text-purple-600 dark:text-purple-400 shadow-2xs">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                    Step 02 • Delivery &amp; Disputes
                  </span>
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Dispute Desk Review
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  After delivery, the buyer can raise a dispute from their order if something is wrong. While a dispute is open, that package&apos;s payout is held and the dispute desk reviews the evidence from both sides before it settles.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 relative z-10">
                <span className="text-xs font-bold text-purple-600 flex items-center gap-1">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Both sides heard before settlement
                </span>
              </div>
            </div>

            {/* Step 03 */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <span aria-hidden="true" className="absolute -bottom-4 -right-2 font-outfit text-8xl font-black text-slate-100 dark:text-slate-800/40 pointer-events-none select-none">
                03
              </span>
              <div className="space-y-4 relative z-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 backdrop-blur-md text-emerald-600 dark:text-emerald-400 shadow-2xs">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    Step 03 • Weekly Payout
                  </span>
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Paid to Your Bank Account
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Settled balances build up in your vendor account. Request a payout from your dashboard and the amount is transferred to your registered Pakistani bank account on the weekly payout cycle.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 relative z-10">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Track every payout in your dashboard
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. Service Level Agreements (SLAs)                                        */}
        {/* ========================================================================= */}
        <div className="mt-16 rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-sun-orange">
              Operations &amp; Logistics Standard
            </span>
            <h2 className="font-outfit text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              Service Level Agreements (SLAs)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              High delivery velocity builds customer loyalty and keeps you in the Pakistan Top Merchant badge eligibility.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Photo with Overlay */}
            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-lg h-72 sm:h-80">
              <img
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"
                alt="Vendora Logistics Fulfillment Center"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 text-xs border border-white/50 shadow-md">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Zap className="h-3.5 w-3.5 fill-sun-orange text-sun-orange" aria-hidden="true" />
                  <span>Bykea Express Fast-Track</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pack within 60 minutes when order placed with Bykea Fulfillment badge for same-market express delivery.
                </p>
              </div>
            </div>

            {/* Right 4 SLA Cards Grid - one aligned, equal-height grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-4.5 shadow-2xs hover:shadow-md transition-all">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40 text-sun-orange mb-2.5 shadow-2xs">
                  <Package className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                </div>
                <h4 className="font-outfit text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Standard National Orders
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  <strong>24 to 48 Hours</strong> maximum to pack and hand over to our national courier network (TCS / Leopard / Trax).
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-4.5 shadow-2xs hover:shadow-md transition-all">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 mb-2.5 shadow-2xs">
                  <Truck className="h-4 w-4" aria-hidden="true" />
                </div>
                <h4 className="font-outfit text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Karachi Same–City Express
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  <strong>3 to 6 Hours</strong> dispatch window for orders qualifying under the PKR 4,500 Bykea cutoff.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-4.5 shadow-2xs hover:shadow-md transition-all">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 mb-2.5 shadow-2xs">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </div>
                <h4 className="font-outfit text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Tamper–Proof Packaging
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  All consignments must be securely packed with tamper-evident tape and carton security seals.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-4.5 shadow-2xs hover:shadow-md transition-all">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 mb-2.5 shadow-2xs">
                  <AlertOctagon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h4 className="font-outfit text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Cancellation &amp; Fault Rate
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Seller fault cancellations must remain strictly below <strong>1.5%</strong> to maintain Top Seller badge.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. Vendor Code of Conduct                                                 */}
        {/* ========================================================================= */}
        <div className="mt-16 rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
              Fair Business &amp; Integrity Charter
            </span>
            <h2 className="font-outfit text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              Vendor Code of Conduct
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Vendora safeguards high consumer trust and transparent dispute arbitration. Placed under signed commercial governance.
            </p>
          </div>

          {/* 3 Code of Conduct Cards - one aligned, equal-height row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-6 flex flex-col gap-3 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40 backdrop-blur-md text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="font-outfit text-sm font-bold text-rose-600 dark:text-rose-400">Anti–Counterfeit Pledge</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Vendora operates zero tolerance on counterfeit or imitation merchandise. Any vendor found distributing imitation goods will face immediate account closure, forfeiture of pending payouts, and blacklisting.
              </p>
              <div className="mt-auto pt-2 text-xs font-bold text-slate-500 border-t border-slate-100 dark:border-white/5">
                Personal punitive fine of 100,000 PKR if breach occurs
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-6 flex flex-col gap-3 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/40 backdrop-blur-md text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Camera className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="font-outfit text-sm font-bold text-purple-600 dark:text-purple-400">Authentic Photography</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Every listing must use actual products photographed in white/neutral studio light. Stock 3D render mockups without real products will fail onboarding review.
              </p>
              <div className="mt-auto pt-2 text-xs font-bold text-slate-500 border-t border-slate-100 dark:border-white/5">
                Minimum 3 distinct angles, 1000x1000px on clean background
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-6 flex flex-col gap-3 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 backdrop-blur-md text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="font-outfit text-sm font-bold text-blue-600 dark:text-blue-400">Communication Etiquette</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                All interactions via Buyer-Seller Messaging must maintain professional courtesy. Diverting customers to external WhatsApp/Direct bank transfers is strictly prohibited and results in immediate delisting.
              </p>
              <div className="mt-auto pt-2 text-xs font-bold text-slate-500 border-t border-slate-100 dark:border-white/5">
                Messaging is recorded for dispute review
              </div>
            </div>
          </div>

          {/* Prohibited Goods & Services Tags */}
          <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 mr-2 flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4 text-rose-500" aria-hidden="true" />
              Prohibited Goods &amp; Services:
            </span>
            <span className="rounded-full bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              Medical Prescription Drugs
            </span>
            <span className="rounded-full bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              Unapproved Dietary Supplements
            </span>
            <span className="rounded-full bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              Replicas &amp; Counterfeits
            </span>
            <span className="rounded-full bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              Unauthorized Copyrighted Items
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default BecomeSellerPage;
