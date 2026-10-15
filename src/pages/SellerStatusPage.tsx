import React from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, ArrowRight, PauseCircle } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { ApplicationPendingCard } from '../features/vendor/components/SellerApplicationForm';
import { Button } from '../components/ui/button';

/**
 * SellerStatusPage — the dedicated landing for a seller whose application
 * is not (or no longer) approved (Batch 63). The vendor route guard sends
 * pending / rejected / suspended sellers here instead of the marketing
 * page, whose "apply now" framing is wrong for an application already in
 * flight. The pending card is the same component BecomeSellerPage renders
 * for its status state, so the two surfaces can never disagree.
 */
export const SellerStatusPage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sun-orange border-t-transparent" />
          <span className="text-xs font-bold text-slate-400">Checking your application...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-20 text-center">
        <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Sign in to check your application
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Your seller application status belongs to your account. Sign in and you will land right
          back here.
        </p>
        <div className="mt-8">
          <Link to="/login?redirect=/seller-status">
            <Button variant="default" size="lg">
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (user.vendorStatus === 'approved') {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-20 text-center">
        <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Your store is approved
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Good news — your seller application has been approved and the Seller Console is open.
        </p>
        <div className="mt-8">
          <Link to="/vendor">
            <Button variant="default" size="lg">
              <span>Go to Seller Console</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (user.vendorStatus === 'pending') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <ApplicationPendingCard businessName={user.name} estimatedTime="24–48 business hours" />
        <div className="mt-4 text-center">
          <Link to="/seller-application">
            <Button variant="outline" size="lg" className="font-bold">
              <span>Track your application</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Nothing else is needed from you right now. Once a decision is made, the Seller Console
          opens for this same account — no new sign-up, no second login.
        </p>
      </div>
    );
  }

  if (user.vendorStatus === 'rejected' || user.vendorStatus === 'suspended') {
    const suspended = user.vendorStatus === 'suspended';
    const reason =
      user.rejectionReason ??
      (suspended
        ? 'No reason was recorded. Contact Vendora support and they can tell you what is needed to reinstate the store.'
        : 'No reason for the decision was recorded. Please review the Merchant Agreement and re-apply with corrected business details.');
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <div
          data-testid="seller-status-notice"
          className="rounded-3xl border border-rose-200 bg-white/80 p-6 text-center shadow-lg dark:border-rose-900/40 dark:bg-slate-900/80 sm:p-8"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40">
            {suspended ? (
              <PauseCircle className="h-8 w-8" aria-hidden="true" />
            ) : (
              <AlertOctagon className="h-8 w-8" aria-hidden="true" />
            )}
          </div>
          <h1 className="font-outfit text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            {suspended ? 'Your store is suspended' : 'Application not approved'}
          </h1>
          <div className="mx-auto mt-4 max-w-md rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-left dark:border-rose-900/40 dark:bg-rose-950/30">
            <div className="mb-1 text-xs font-semibold text-rose-900 dark:text-rose-200">
              Reason recorded:
            </div>
            <p className="text-xs leading-relaxed text-rose-700 dark:text-rose-300">{reason}</p>
          </div>
          <p className="mx-auto mt-4 max-w-md text-xs text-slate-500 dark:text-slate-400">
            {suspended
              ? 'While the store is suspended the Seller Console stays closed, but your customer account keeps working as usual.'
              : 'You can correct your business information and submit a new application for review.'}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {!suspended && (
              <Link to="/become-a-seller">
                <Button variant="default" size="lg" className="font-bold">
                  <span>Review and re-apply</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            )}
            <Link to="/help">
              <Button variant="outline" size="lg">
                <span>Contact support</span>
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="lg">
                <span>Continue shopping</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // vendorStatus 'none' — no application on file for this account.
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-20 text-center">
      <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        No seller application yet
      </h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        This account has not applied to sell on Vendora. Start the application and this page will
        track its status.
      </p>
      <div className="mt-8">
        <Link to="/become-a-seller">
          <Button variant="default" size="lg">
            <span>Apply to sell on Vendora</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
