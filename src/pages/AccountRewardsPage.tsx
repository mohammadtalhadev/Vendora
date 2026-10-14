import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Gift, Sparkles, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCurrency } from '../store/currency-store';
import { useMyGiftCards, useMyRewards, useRedeemLoyaltyPoints } from '../features/rewards/hooks/useRewards';
import { referralLinkFor, type RedeemResult } from '../features/rewards/api/rewards';

const KIND_LABEL: Record<string, string> = {
  earn: 'Earned from a delivered order',
  redeem: 'Redeemed for a coupon',
  referral: 'Referral reward',
};

/**
 * Rewards & Gift Cards (/account/rewards) — the customer's loyalty balance,
 * point redemption into real coupons, and their referral code/link, all
 * read from `get_my_rewards`. Points are earned by Postgres when a package
 * is delivered (1 point per Rs 100 of subtotal) and by referrals (250).
 */
export const AccountRewardsPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { data: rewards, isLoading, isError } = useMyRewards();
  const { data: giftCards } = useMyGiftCards();
  const redeem = useRedeemLoyaltyPoints();

  const [redeemPoints, setRedeemPoints] = useState('100');
  const [redeemed, setRedeemed] = useState<RedeemResult | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const points = rewards?.points ?? 0;
  const redeemValue = Number(redeemPoints);
  const redeemValid =
    Number.isFinite(redeemValue) && redeemValue >= 100 && redeemValue % 100 === 0 && redeemValue <= points;

  const copyText = async (text: string, which: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      setCopied(null);
    }
  };

  const handleRedeem = () => {
    if (!redeemValid || redeem.isPending) return;
    redeem.mutate(redeemValue, {
      onSuccess: (result) => setRedeemed(result),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
          Rewards &amp; Gift Cards
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Loyalty points from delivered orders and referrals, and the gift cards you have bought.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-label="Loading your rewards">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800" />
          ))}
        </div>
      ) : isError || !rewards ? (
        <div className="rounded-3xl border border-white/80 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
            Your rewards could not be loaded
          </h2>
          <p className="mt-1 text-xs text-slate-500">Please refresh the page in a moment.</p>
        </div>
      ) : (
        <>
          {/* Loyalty balance + redemption */}
          <section className="rounded-3xl border border-white/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sun-orange" aria-hidden="true" />
              <h2 className="font-outfit text-lg font-black text-slate-900 dark:text-white">Loyalty points</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              <div>
                <p className="font-outfit text-3xl font-black text-slate-900 dark:text-white">{points.toLocaleString()}</p>
                <p className="text-[11px] font-semibold text-slate-400">Points balance</p>
              </div>
              <div>
                <p className="font-outfit text-3xl font-black text-slate-900 dark:text-white">
                  {rewards.lifetimeEarned.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold text-slate-400">Lifetime earned</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              You earn 1 point for every Rs 100 of a package&apos;s subtotal when it is delivered.
              Points convert to a real checkout coupon at 100 points = {formatPrice(100)}.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label htmlFor="redeem-points" className="sr-only">
                Points to redeem
              </label>
              <input
                id="redeem-points"
                type="number"
                min={100}
                step={100}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                className="h-10 w-36 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-sun-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <Button type="button" size="sm" onClick={handleRedeem} disabled={!redeemValid || redeem.isPending}>
                {redeem.isPending ? 'Creating coupon…' : 'Redeem for a coupon'}
              </Button>
              {points < 100 && (
                <span className="text-xs text-slate-400">Earn at least 100 points to redeem.</span>
              )}
              {points >= 100 && !redeemValid && (
                <span className="text-xs font-semibold text-rose-600">
                  Enter a multiple of 100, up to your balance.
                </span>
              )}
            </div>
            {redeem.isError && (
              <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">
                {redeem.error.message}
              </p>
            )}
            {redeemed && (
              <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Your coupon is ready — use it at checkout within 30 days. It is worth{' '}
                  {formatPrice(redeemed.value)} and works once.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-xl bg-white px-3 py-2 font-mono text-sm font-black tracking-wider text-slate-900 dark:bg-slate-900 dark:text-white">
                    {redeemed.code}
                  </code>
                  <Button type="button" size="sm" variant="outline" className="gap-2 bg-white" onClick={() => copyText(redeemed.code, 'code')}>
                    {copied === 'code' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    {copied === 'code' ? 'Copied' : 'Copy code'}
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Referrals */}
          <section className="rounded-3xl border border-white/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sun-orange" aria-hidden="true" />
              <h2 className="font-outfit text-lg font-black text-slate-900 dark:text-white">Refer friends</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Share your link. When someone who signed up through it gets their first order
              delivered, you earn 250 points.
            </p>
            {rewards.referralCode ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <code className="rounded-xl bg-slate-100 px-3 py-2 font-mono text-sm font-black tracking-wider text-slate-900 dark:bg-white/10 dark:text-white">
                    {rewards.referralCode}
                  </code>
                  <span className="min-w-0 flex-1 truncate rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-white/5">
                    {referralLinkFor(rewards.referralCode)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => copyText(referralLinkFor(rewards.referralCode as string), 'link')}
                  >
                    {copied === 'link' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    {copied === 'link' ? 'Copied' : 'Copy link'}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {rewards.referralsRewarded} referral{rewards.referralsRewarded === 1 ? '' : 's'} rewarded ·{' '}
                  {rewards.referralsPending} waiting for a first delivery
                </p>
              </>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Your referral code is being prepared.</p>
            )}
          </section>

          {/* Recent activity */}
          <section className="rounded-3xl border border-white/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <h2 className="font-outfit text-lg font-black text-slate-900 dark:text-white">Recent activity</h2>
            {rewards.recentTransactions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No points activity yet. Points appear here when an order is delivered, a referral
                is rewarded, or you redeem points for a coupon.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/5">
                {rewards.recentTransactions.map((txn) => (
                  <li key={txn.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {KIND_LABEL[txn.kind] ?? txn.kind}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(txn.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-sm font-black ${txn.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {txn.points >= 0 ? '+' : ''}
                      {txn.points} pts
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Gift cards summary */}
          <section className="rounded-3xl border border-white/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-sun-orange" aria-hidden="true" />
                <h2 className="font-outfit text-lg font-black text-slate-900 dark:text-white">Gift cards</h2>
              </div>
              <Link to="/gift-cards" className="text-xs font-bold text-sun-orange hover:underline">
                Buy or manage gift cards
              </Link>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {giftCards && giftCards.cards.length > 0
                ? `You have bought ${giftCards.cards.length} gift card${giftCards.cards.length === 1 ? '' : 's'} with a combined remaining balance of ${formatPrice(giftCards.cards.reduce((sum, card) => sum + card.balance, 0))}.`
                : 'You have not bought any gift cards yet.'}
            </p>
          </section>
        </>
      )}
    </div>
  );
};

export default AccountRewardsPage;
