import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, ClipboardList, LogIn, Store } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/ui/status-badge';
import {
  fetchMyApplications,
  type MyVendorApplication,
  type VendorApplicationStatus,
} from '../features/vendor/api/applications';

/** Honest next steps per status — what actually happens, and what (if anything) the applicant can do. */
const NEXT_STEPS: Record<VendorApplicationStatus, string> = {
  pending:
    'Your application is in the review queue. No action is needed from you — Vendora verifies your business details and documents, and the decision appears here and in your notifications.',
  under_review:
    'A reviewer is actively checking your application. No action is needed unless the review note below asks for something — if it does, submit a corrected application from the seller page.',
  approved:
    'Your store is approved. Sign in and open the vendor dashboard to add products and start selling.',
  rejected:
    'This application was not approved. Read the review note below, correct the details it names, then submit a new application from the seller page.',
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const ApplicationCard: React.FC<{ application: MyVendorApplication }> = ({ application }) => (
  <article className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-sm sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-outfit text-xl font-extrabold tracking-tight text-slate-900">
          {application.proposedStoreName}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {application.businessType} · /vendors/{application.proposedSlug}
        </p>
      </div>
      <StatusBadge status={application.status} className="text-[11px]" />
    </div>

    <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
      <div>
        <dt className="font-bold uppercase tracking-wider text-slate-400">Submitted</dt>
        <dd className="mt-0.5">{formatDate(application.createdAt)}</dd>
      </div>
      {application.reviewedAt && (
        <div>
          <dt className="font-bold uppercase tracking-wider text-slate-400">Reviewed</dt>
          <dd className="mt-0.5">{formatDate(application.reviewedAt)}</dd>
        </div>
      )}
    </dl>

    {application.reviewNote && (
      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-left">
        <div className="text-xs font-semibold text-rose-900">Review note</div>
        <p className="mt-1 text-xs leading-relaxed text-rose-700">{application.reviewNote}</p>
      </div>
    )}

    <p className="mt-4 text-sm leading-relaxed text-slate-600">
      {NEXT_STEPS[application.status]}
    </p>

    {application.status === 'approved' && (
      <div className="mt-5">
        <Link to="/vendor">
          <Button variant="orange-cta" className="font-bold">
            <span>Go to Vendor Dashboard</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    )}
    {application.status === 'rejected' && (
      <div className="mt-5">
        <Link to="/become-a-seller">
          <Button variant="orange-cta" className="font-bold">
            <span>Submit a corrected application</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    )}
  </article>
);

/**
 * Seller application tracking: the signed-in applicant's own `vendor_applications`
 * rows (RLS `applications_select_own`), newest first, with the real review state —
 * the page the "Track your application" link on the seller page points at.
 */
export const SellerApplicationPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const applicationsQuery = useQuery({
    queryKey: ['my-vendor-applications', userId],
    queryFn: () => fetchMyApplications(userId as string),
    enabled: Boolean(userId),
  });

  const applications = applicationsQuery.data ?? [];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-none dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased pb-24">
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-10 sm:px-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-sun-orange">
            <ClipboardList className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-outfit text-3xl font-black tracking-tight text-slate-900">
            Your Seller Applications
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            The real status of every application this account has submitted, straight from the
            review queue.
          </p>
        </div>

        <div className="mt-10 space-y-5">
          {!userId ? (
            <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-sm">
              <LogIn className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="mt-3 font-semibold text-slate-800">Sign in to track your application</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Applications are tied to the account that submitted them, so tracking needs that
                account signed in.
              </p>
              <Link to="/login" className="mt-5 inline-block">
                <Button variant="orange-cta" className="font-bold">
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          ) : applicationsQuery.isPending ? (
            <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-sm">
              <Store className="mx-auto h-8 w-8 animate-pulse text-slate-300" aria-hidden="true" />
              <p className="mt-3 font-semibold text-slate-700">Reading your applications…</p>
            </div>
          ) : applicationsQuery.isError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span>
                  {applicationsQuery.error instanceof Error
                    ? applicationsQuery.error.message
                    : 'Could not load your applications.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void applicationsQuery.refetch()}
                className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-sm">
              <Store className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="mt-3 font-semibold text-slate-800">No applications yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                This account has not applied to sell on Vendora. Start an application and its status
                will be tracked here.
              </p>
              <Link to="/become-a-seller" className="mt-5 inline-block">
                <Button variant="orange-cta" className="font-bold">
                  <span>Apply to sell</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          ) : (
            applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
