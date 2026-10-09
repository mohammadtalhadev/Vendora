import { useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  RotateCcw,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  SellerApplicationForm,
  ApplicationPendingCard,
} from '../features/vendor/components/SellerApplicationForm';
import { useAuthStore } from '../store/auth-store';

export const BecomeSellerPage: FC = () => {
  const { user, setUser } = useAuthStore();
  const [isReapplying, setIsReapplying] = useState(false);

  // Determine current vendor application status
  const vendorStatus = isReapplying ? 'none' : (user?.vendorStatus || 'none');

  const handleReapply = () => {
    if (user) {
      setUser({
        ...user,
        vendorStatus: 'none',
      });
    }
    setIsReapplying(true);
  };

  const rejectionReason =
    (user as { rejectionReason?: string } | null)?.rejectionReason ||
    'Business documentation could not be verified with our partner registry. Please check that your business name, tax identification, and store information match official documents and re-apply.';

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10">
      {/* =========================================================================
          1. Hero & Value Proposition Banner
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#FF7A1A]/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#00B8C8]/15 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#FF7A1A]" />
            <span className="font-outfit">Vendora Merchant Program</span>
          </div>

          <h1 className="font-outfit mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Sell to Hundreds of Thousands on Vendora
          </h1>

          <p className="font-outfit mt-4 text-base text-slate-300 sm:text-lg">
            Scale your brand with industry-lowest commission rates, instant split payouts, and automated fulfillment tools built for modern merchants.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Zero Listing Fees</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Automated Weekly & Instant Payouts</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Free Storefront URL</span>
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. Three Core Seller Benefits
          ========================================================================= */}
      <section className="mt-10" aria-label="Seller Benefits">
        <div className="text-center mb-8">
          <Badge variant="vendora-platform" className="mb-2">
            Why Sell on Vendora
          </Badge>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Built for Merchant Growth and Transparency
          </h2>
          <p className="mt-1 text-sm text-slate-500 max-w-xl mx-auto">
            Everything you need to showcase products, manage split orders, and keep the highest margins possible.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Benefit 1: Low Commission */}
          <div className="card-solid rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-[#FF7A1A] mb-4">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="vendora-platform" size="sm">
                5% – 8% Rate
              </Badge>
              <span className="text-xs font-semibold text-emerald-600">Keep 92-95%</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Industry-Low Commission
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Stop paying 15% to 20% on traditional marketplaces. Vendora charges transparent 5–8% category fees with zero hidden listing charges or mandatory ad fees.
            </p>
          </div>

          {/* Benefit 2: Instant Payouts */}
          <div className="card-solid rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-[#00B8C8] mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="vendor-verified" size="sm">
                Automated Split
              </Badge>
              <span className="text-xs font-semibold text-cyan-700">Instant & Weekly</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Instant Split Payouts
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              When a buyer places a multi-vendor order, customer funds are split automatically. Frozen fee deductions protect your net earnings, deposited weekly or instantly.
            </p>
          </div>

          {/* Benefit 3: Platform Reach */}
          <div className="card-solid rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 mb-4">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" size="sm">
                500,000+ Buyers
              </Badge>
              <span className="text-xs font-semibold text-purple-700">High-Intent Traffic</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Massive Platform Reach
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Gain instant access to a growing marketplace of active technology, design, and physical product shoppers with built-in search optimization and storefront sharing.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. Dynamic Onboarding / Status Decision Engine
          ========================================================================= */}
      <section className="mt-12 max-w-2xl mx-auto" aria-label="Seller Application Status">
        {/* State A: Already Approved Vendor */}
        {vendorStatus === 'approved' && (
          <div
            data-testid="approved-vendor-status"
            className="card-solid overflow-hidden rounded-3xl border border-emerald-200/80 bg-white/95 p-6 text-center shadow-lg sm:p-8"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <Badge variant="vendor-verified" size="lg" className="mb-2">
              Already Approved
            </Badge>

            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Already Approved
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Your merchant account is active and verified! You already have full access to manage your products, track orders, view analytics, and customize your storefront.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/vendor">
                <Button variant="orange-cta" size="lg" className="font-bold">
                  <span>Go to Vendor Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
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
            className="card-solid overflow-hidden rounded-3xl border border-rose-200 bg-white/95 p-6 text-center shadow-lg sm:p-8"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
              <AlertOctagon className="h-8 w-8" />
            </div>

            <Badge variant="discount-coral" size="lg" className="mb-2">
              Application Notice
            </Badge>

            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Application Not Approved
            </h2>

            <div className="mx-auto mt-4 max-w-md rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-left">
              <div className="text-xs font-semibold text-rose-900 mb-1">
                Reason for Decision:
              </div>
              <p
                data-testid="rejection-reason"
                className="text-xs text-rose-700 leading-relaxed"
              >
                {rejectionReason}
              </p>
            </div>

            <p className="mx-auto mt-4 max-w-md text-xs text-slate-500">
              You can update your business information, correct store details, and submit a new application for review.
            </p>

            <div className="mt-6 flex justify-center">
              <Button
                variant="orange-cta"
                size="lg"
                onClick={handleReapply}
                className="font-bold"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                <span>Re-apply</span>
              </Button>
            </div>
          </div>
        )}

        {/* State D: New Applicant (renders SellerApplicationForm) */}
        {vendorStatus !== 'approved' &&
          vendorStatus !== 'pending' &&
          vendorStatus !== 'rejected' && (
            <SellerApplicationForm
              onSuccess={() => {
                // Auth store update triggers re-render into pending state
              }}
            />
          )}
      </section>
    </div>
  );
};

export default BecomeSellerPage;
