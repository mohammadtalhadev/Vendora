import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Gift, Share2, ShoppingBag, Sparkles, Store } from 'lucide-react';
import { PolicyShell } from '../components/common/PolicyShell';
import { useAuthStore } from '../store/auth-store';
import { useReferralSummary } from '../features/rewards/hooks/useRewards';
import { referralLinkFor } from '../features/rewards/api/rewards';

/**
 * Creator & Affiliate Program — now the real referral program.
 *
 * This page used to be an honest "not launched" notice because no backend
 * existed. Batch 39 built one: every account has a referral code, signing
 * up through a referral link links the new account to the referrer, and
 * when the referee's first package is delivered Postgres awards the
 * referrer 250 loyalty points. Points convert to real checkout coupons
 * at 100 points = Rs 100 on the Rewards page. Those are the only claims
 * this page makes — no payout totals, no invented earnings.
 */
export const AffiliatePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const summary = useReferralSummary();
  const [copied, setCopied] = useState(false);

  const referralCode = summary?.referralCode ?? null;
  const referralLink = referralCode ? referralLinkFor(referralCode) : null;

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <PolicyShell
      eyebrow="Referral Program"
      title="Share Vendora, earn loyalty points"
      intro={
        <>
          <p>
            Vendora&apos;s referral program is live, and it runs on the loyalty system — not on
            promises. Every account has a personal referral link. When someone signs up through
            your link and their first order is delivered, you earn{' '}
            <strong className="text-slate-900">250 loyalty points</strong>.
          </p>
          <p>
            Points are real: you also earn 1 point for every Rs 100 of a delivered order&apos;s
            subtotal, and any 100 points convert into a Rs 100 coupon you can spend at checkout.
            Your balance, referral counts and coupon codes live on your{' '}
            <Link to="/account/rewards" className="font-bold text-sun-orange hover:underline">
              Rewards &amp; Gift Cards
            </Link>{' '}
            page.
          </p>
        </>
      }
    >
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <li className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs">
          <Share2 className="h-5 w-5 text-sun-orange" />
          <p className="mt-3 text-sm font-extrabold text-slate-900">1. Share your link</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Send your personal referral link to friends who have not joined Vendora yet.
          </p>
        </li>
        <li className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs">
          <ShoppingBag className="h-5 w-5 text-sun-orange" />
          <p className="mt-3 text-sm font-extrabold text-slate-900">2. They shop &amp; receive</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            The referral counts when their first order is actually delivered — not at sign-up.
          </p>
        </li>
        <li className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs">
          <Sparkles className="h-5 w-5 text-sun-orange" />
          <p className="mt-3 text-sm font-extrabold text-slate-900">3. You earn 250 points</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Points land in your loyalty balance and convert to coupons at 100 points = Rs 100.
          </p>
        </li>
      </ol>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
        {user ? (
          referralLink ? (
            <>
              <h2 className="font-outfit text-base font-black text-slate-900">Your referral link</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="rounded-xl bg-slate-100 px-3 py-2 font-mono text-sm font-black tracking-wider text-slate-900">
                  {referralCode}
                </code>
                <span className="min-w-0 flex-1 truncate rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {referralLink}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600"
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
              {summary && (
                <p className="mt-3 text-xs text-slate-500">
                  {summary.referralsRewarded} referral{summary.referralsRewarded === 1 ? '' : 's'} rewarded ·{' '}
                  {summary.referralsPending} waiting for a first delivery · your balance is{' '}
                  {summary.points.toLocaleString()} points
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-600">
              Your referral link is being prepared — check your{' '}
              <Link to="/account/rewards" className="font-bold text-sun-orange hover:underline">
                Rewards page
              </Link>{' '}
              in a moment.
            </p>
          )
        ) : (
          <>
            <h2 className="font-outfit text-base font-black text-slate-900">Get your link</h2>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to see your personal referral code and link, your points balance and how
              many referrals have been rewarded.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600"
            >
              Sign in to get your referral link
            </Link>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/gift-cards"
          className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
        >
          <Gift className="h-5 w-5 text-sun-orange" />
          <p className="mt-3 text-sm font-extrabold text-slate-900">Gift cards</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Prefer giving credit directly? Buy a gift card with a real, spendable balance.
          </p>
        </Link>
        <Link
          to="/become-a-seller"
          className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
        >
          <Store className="h-5 w-5 text-sun-orange" />
          <p className="mt-3 text-sm font-extrabold text-slate-900">Sell on Vendora</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Selling is open today — open a real store and list products now.
          </p>
        </Link>
      </div>
    </PolicyShell>
  );
};
