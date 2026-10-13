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
  X,
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
  const [showApplicationModal, setShowApplicationModal] = useState(false);

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
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="font-outfit text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Transparent Pricing. Fair Growth.{' '}
            <span className="bg-gradient-to-r from-sun-orange to-rose-600 bg-clip-text text-transparent">
              Zero Hidden Fees.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Enable and grow Vendora partners with verified Pakistani merchants — featuring regulated escrow payout schedules, fair selling charters, and market-leading commission structures.
          </p>

          {/* 4 Stat Badges Strip - one aligned, equal-height row */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-5 text-center shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
              <div className="font-outfit text-2xl sm:text-3xl font-black text-sun-orange">0%</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">Risk-Free Onboarding</p>
            </div>

            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-5 text-center shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
              <div className="font-outfit text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">Monday</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">Global Swift Liquidation</p>
            </div>

            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-5 text-center shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
              <div className="font-outfit text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">SBP Tier-1</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">Escrow Security Control</p>
            </div>

            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-5 text-center shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
              <div className="font-outfit text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{formatPrice(0)}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">Platform Maintenance Fee</p>
            </div>
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
                <Badge variant="secondary" size="sm">500,000+ Buyers</Badge>
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
          className="mt-16 max-w-2xl mx-auto"
          role="status"
          aria-label="Merchant application status"
        >
          {/* State A: Already Approved Vendor */}
          {vendorStatus === 'approved' && (
            <div
              data-testid="approved-vendor-status"
              className="rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 text-center shadow-lg sm:p-8"
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
            <div data-testid="pending-vendor-status">
              <ApplicationPendingCard
                businessName={user?.name}
                estimatedTime="24–48 business hours"
              />
            </div>
          )}

          {/* State C: Application Rejected */}
          {vendorStatus === 'rejected' && (
            <div
              data-testid="rejected-vendor-status"
              className="rounded-3xl border border-rose-200 dark:border-rose-900/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 text-center shadow-lg sm:p-8"
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-sun-orange">
                Guaranteed Tiered Commission Structure
              </span>
              <h2 className="font-outfit text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                Official Category Commission Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Compare Vendora's fair rates against legacy marketplaces in Pakistan. Every verified store enjoys zero listing fees for the first quarter.
              </p>
            </div>

            {/* Earnings Simulator Box */}
            <div className="rounded-2xl border border-orange-200/80 bg-orange-50/70 dark:border-orange-900/40 dark:bg-orange-950/30 p-4 lg:w-96 shrink-0 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-outfit text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5 text-sun-orange" aria-hidden="true" />
                  Earnings Simulator
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Real-Time Estimator</span>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="monthly-sales"
                  className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
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
                <p className="text-[10px] text-slate-400">
                  Entered in the platform&apos;s base unit; shown in your selected currency.
                </p>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">Est. Net Take-Home (IBFT Payout):</span>
                  <span className="font-outfit text-sm font-black text-rose-600 dark:text-rose-400">
                    {formatPrice(netTakeHome)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
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
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                  <th className="py-3 px-4">Product Category</th>
                  <th className="py-3 px-4">Standard Commission</th>
                  <th className="py-3 px-4">Introductory 90-Day Rate</th>
                  <th className="py-3 px-4">Gateway &amp; Escrow Fee</th>
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
                      <span className="text-[10px] font-normal text-slate-400">Phones, TWS, Home Audio, Components</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">5.5%</td>
                  <td className="py-4 px-4">
                    <span className="rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
                      0.0% Free
                    </span>
                  </td>
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
                      <span className="text-[10px] font-normal text-slate-400">Fabricated Lawn, Footwear, Handcrafted Leather</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">7.0%</td>
                  <td className="py-4 px-4">
                    <span className="rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
                      0.0% Free
                    </span>
                  </td>
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
                      <span className="text-[10px] font-normal text-slate-400">Organic Serums, Dermatics, Scents</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">4.5%</td>
                  <td className="py-4 px-4">
                    <span className="rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
                      0.0% Free
                    </span>
                  </td>
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
                      <span className="text-[10px] font-normal text-slate-400">Blue Pottery Multan, Brass, Crockery</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">4.0%</td>
                  <td className="py-4 px-4">
                    <span className="rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
                      0.0% Free
                    </span>
                  </td>
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
                      <span className="text-[10px] font-normal text-slate-400">Templates, Fonts, Licensed Utility Apps</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-outfit font-black text-slate-900 dark:text-white">4.0%</td>
                  <td className="py-4 px-4">
                    <span className="rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
                      0.0% Free
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-500">0% Standard (Absorbed)</td>
                  <td className="py-4 px-4 font-semibold text-purple-600">Every Monday</td>
                  <td className="py-4 px-4 text-right text-slate-400 font-mono">15% – 25%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. Escrow Protection & Payout Protocol (3 Big Cards)                       */}
        {/* ========================================================================= */}
        <div className="mt-16 space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sun-orange">
              SBP COMPLIANT ESCROW SETTLEMENT REGIME
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Escrow Protection &amp; Payout Protocol
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Never worry about unpaid COD or delayed disbursements. Your funds are secured from order checkout to doorstep settlement.
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sun-orange">
                    Step 01 • Order Placed
                  </span>
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Escrow Vault Lock
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  When a buyer purchases a consignment, funds are held in SBP-compliant escrow bank security accounts (Meezan Bank Trust). Capital is fully insulated from operational risk.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 relative z-10">
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Zero cancellation &amp; risk
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                    Step 02 • Quality Inspection
                  </span>
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    7–Day Customer Inspection
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upon confirmed delivery by courier partner (TCS, Bykea, Leopard), a 7-day inspection window starts. Unless a dispute is lodged within 168 hours, funds automatically transition to "Approved Settlement".
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 relative z-10">
                <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Automated dispute protection
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Step 03 • Instant Disbursement
                  </span>
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Monday 11:30 AM IBFT Transfer
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Every Monday at 09:30 AM PKT, approved balances are disbursed directly into your Pakistani bank account (Meezan, HBL, Standard Chartered, or EasyPaisa/JazzCash) without deduction fees.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 relative z-10">
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Instant transaction validation
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-sun-orange">
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
                  <Zap className="h-3.5 w-3.5 text-sun-orange" aria-hidden="true" />
                  <span>Bykea Express Fast-Track</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Vendora operates zero tolerance on counterfeit or imitation merchandise. Any vendor found distributing imitation goods will face immediate account closure, forfeiture of escrow funds, and blacklisting.
              </p>
              <div className="mt-auto pt-2 text-[10px] font-bold text-slate-400 border-t border-slate-100 dark:border-white/5">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Every listing must use actual products photographed in white/neutral studio light. Stock 3D render mockups without real products will fail onboarding review.
              </p>
              <div className="mt-auto pt-2 text-[10px] font-bold text-slate-400 border-t border-slate-100 dark:border-white/5">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                All interactions via Buyer-Seller Messaging must maintain professional courtesy. Diverting customers to external WhatsApp/Direct bank transfers is strictly prohibited and results in immediate delisting.
              </p>
              <div className="mt-auto pt-2 text-[10px] font-bold text-slate-400 border-t border-slate-100 dark:border-white/5">
                Encrypted messaging recorded for escrow audit
              </div>
            </div>
          </div>

          {/* Prohibited Goods & Services Tags */}
          <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 mr-2 flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4 text-rose-500" aria-hidden="true" />
              Prohibited Goods &amp; Services:
            </span>
            <span className="rounded-full bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              Medical Prescription Drugs
            </span>
            <span className="rounded-full bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              Unapproved Dietary Supplements
            </span>
            <span className="rounded-full bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              Replicas &amp; Counterfeits
            </span>
            <span className="rounded-full bg-white/70 dark:bg-white/5 border border-white/80 dark:border-white/10 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              Unauthorized Copyrighted Items
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. Bottom Call to Action Banner (Rich Gradient & Glowing Ethereal Orbs)   */}
        {/* ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-gradient-to-br from-orange-50/90 via-white/85 to-cyan-50/75 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-slate-900/90 backdrop-blur-2xl p-8 sm:p-14 shadow-xl text-center space-y-5">
          {/* Top Multi-tone Accent Stripe */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sun-orange via-aqua to-lemon" />

          {/* Ambient Glowing Orbs inside CTA */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-tr from-sun-orange-200/50 via-sun-orange-100/60 to-transparent blur-[90px] dark:from-sun-orange/15 pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-bl from-aqua-100/60 via-[#F1F5F9]/70 to-transparent blur-[90px] dark:from-aqua/15 pointer-events-none" />
          </div>

          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/85 dark:bg-orange-950/40 px-3.5 py-1 text-[11px] font-bold text-sun-orange shadow-xs">
              <Sparkles className="h-3 w-3 text-sun-orange" aria-hidden="true" />
              LAUNCH WITH 90 DAYS ZERO COMMISSION GUARANTEE
            </div>

            <h2 className="font-outfit text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Ready to scale your brand across Pakistan?
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Register your store in less than five minutes. Benefit from 0% commission for 90 days, automated dispatch integrations, and direct bank weekly payouts.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowApplicationModal(true)}
                className="rounded-2xl bg-gradient-to-r from-sun-orange to-[#FF9040] hover:from-sun-orange-600 hover:to-sun-orange px-7 py-3.5 text-xs font-bold text-white shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Apply as a Merchant</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => alert('Downloading official Vendora Seller Handbook 2026 PDF...')}
                className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Download Seller Handbook (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Merchant Application Modal */}
      {showApplicationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-onboarding-title"
            className="relative w-full max-w-2xl rounded-3xl border border-white/80 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl my-8"
          >
            <button
              type="button"
              onClick={() => setShowApplicationModal(false)}
              aria-label="Close merchant application form"
              title="Close"
              className="absolute top-4 right-4 h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="mb-6">
              <h3
                id="seller-onboarding-title"
                className="font-outfit text-xl font-black text-slate-900 dark:text-white"
              >
                Start Your Merchant Onboarding
              </h3>
              <p className="text-xs text-slate-500">Fast 5-minute verification with SBP Escrow account activation.</p>
            </div>
            <SellerApplicationForm />
          </div>
        </div>
      )}
    </div>
  );
};

export default BecomeSellerPage;
