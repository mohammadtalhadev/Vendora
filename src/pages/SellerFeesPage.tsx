import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Banknote, Percent, Receipt, Store } from 'lucide-react';
import { fetchCommissionRates, INSTANT_PAYOUT_FEE_RATE } from '../features/vendor/api/fees';
import { useCategories } from '../features/catalog/hooks/useProducts';
import { formatPrice } from '../store/currency-store';
import { PolicyShell } from '../components/common/PolicyShell';

const pct = (rate: number): string => `${Math.round(rate * 1000) / 10}%`;

/**
 * Seller Fees (/seller-fees). Every figure on this page is read from the
 * platform's own configuration: the standard commission and the category
 * overrides come from the live database, and the payout fee is the one
 * `request_payout` charges. Nothing here is a marketing rate.
 */
export const SellerFeesPage: React.FC = () => {
  const rates = useQuery({
    queryKey: ['seller-fees', 'commission'] as const,
    queryFn: ({ signal }) => fetchCommissionRates(signal),
    staleTime: 5 * 60 * 1000,
  });
  const categories = useCategories();
  const globalRate = rates.data?.globalRate ?? null;
  const overrides = (categories.data?.categories ?? []).filter(
    (c) => c.commissionRateOverride !== null && c.commissionRateOverride !== undefined,
  );

  const exampleGoods = 10000;

  return (
    <PolicyShell
      eyebrow="Selling on Vendora"
      title="Seller Fees, Explained Plainly"
      intro={
        <p>
          One commission on what you sell, and one optional payout fee. The rates below
          are read from the platform&apos;s live configuration — the same numbers the
          system applies to real orders — not a brochure.
        </p>
      }
    >
        {/* ── How commission works ── */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Percent,
              title: 'Commission on goods only',
              body: 'Commission is charged on the item subtotal of each package. Delivery charges are never commissioned.',
            },
            {
              icon: Receipt,
              title: 'Frozen at order time',
              body: 'The rate that applies is locked onto the order when the buyer checks out. A later rate change never rewrites an order you already took.',
            },
            {
              icon: Store,
              title: 'Three rates, one winner',
              body: 'If your store has an agreed rate it wins; otherwise a category rate applies where one is set; otherwise the platform standard rate.',
            },
          ].map((card) => (
            <article key={card.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sun-orange/10 text-sun-orange">
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-3 font-outfit text-base font-black text-slate-900">{card.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{card.body}</p>
            </article>
          ))}
        </section>

        {/* ── Live rates ── */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs">
          <div className="border-b border-slate-100 p-6 sm:p-8">
            <h2 className="font-outfit text-lg font-black text-slate-900">Current rates</h2>
            <p className="mt-1 text-xs text-slate-500">
              Read live from the platform configuration.
            </p>
          </div>
          <dl className="divide-y divide-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 sm:px-8">
              <dt className="text-sm font-bold text-slate-700">Platform standard commission</dt>
              <dd className="font-outfit text-lg font-black text-slate-900">
                {globalRate !== null ? (
                  pct(globalRate)
                ) : (
                  <span className="text-sm font-semibold text-slate-400">
                    Shown to signed-in sellers —{' '}
                    <Link to="/login" className="font-bold text-sun-orange hover:underline">
                      sign in
                    </Link>{' '}
                    to see the current figure
                  </span>
                )}
              </dd>
            </div>
            {overrides.map((c) => (
              <div key={c.slug} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 sm:px-8">
                <dt className="text-sm font-bold text-slate-700">
                  {c.name} <span className="font-semibold text-slate-400">(category rate)</span>
                </dt>
                <dd className="font-outfit text-lg font-black text-slate-900">
                  {pct(c.commissionRateOverride as number)}
                </dd>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 sm:px-8">
              <dt className="text-sm font-bold text-slate-700">
                Listing fees <span className="font-semibold text-slate-400">(per product)</span>
              </dt>
              <dd className="font-outfit text-lg font-black text-slate-900">None</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 sm:px-8">
              <dt className="text-sm font-bold text-slate-700">Store subscription</dt>
              <dd className="font-outfit text-lg font-black text-slate-900">None</dd>
            </div>
          </dl>
        </section>

        {/* ── Payout fees + worked example ── */}
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sun-orange/10 text-sun-orange">
              <Banknote className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 font-outfit text-base font-black text-slate-900">Getting paid</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
              <li>
                <strong className="text-slate-900">Standard payout rail: no fee.</strong>{' '}
                Your available balance moves to your bank details on file.
              </li>
              <li>
                <strong className="text-slate-900">
                  Instant payout rail: {pct(INSTANT_PAYOUT_FEE_RATE)} fee.
                </strong>{' '}
                Charged on the amount you withdraw, shown before you confirm — the same
                fee the payout system itself applies.
              </li>
              <li>
                A package&apos;s earnings join your available balance once the order is
                delivered and settled; your Earnings page shows every package, its
                commission and its net.
              </li>
            </ul>
          </article>

          <article className="rounded-3xl bg-slate-900 p-6 text-white shadow-2xs sm:p-8">
            <h2 className="font-outfit text-base font-black">A worked example</h2>
            {globalRate !== null ? (
              <div className="mt-4 space-y-3 text-sm">
                <p className="text-slate-300">
                  You sell goods worth {formatPrice(exampleGoods)} at the standard rate:
                </p>
                <dl className="space-y-2 border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <dt className="text-slate-300">Goods subtotal</dt>
                    <dd className="font-bold">{formatPrice(exampleGoods)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-300">Commission ({pct(globalRate)})</dt>
                    <dd className="font-bold">− {formatPrice(exampleGoods * globalRate)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-3 text-base">
                    <dt className="font-black">You keep</dt>
                    <dd className="font-outfit font-black text-sun-orange">
                      {formatPrice(exampleGoods * (1 - globalRate))}
                    </dd>
                  </div>
                </dl>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Delivery charges are passed through untouched. Category-rate goods use
                  their category rate instead.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                Sign in as a seller to see this example worked with the platform&apos;s
                current standard rate.
              </p>
            )}
          </article>
        </section>

        {/* ── CTA ── */}
        <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-orange-100 bg-orange-50 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-outfit text-lg font-black text-slate-900">Ready when you are</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
              Read the{' '}
              <Link to="/seller-policy" className="font-bold text-sun-orange hover:underline">
                Seller Policy
              </Link>{' '}
              for the rules of the marketplace, then apply to open your store.
            </p>
          </div>
          <Link
            to="/become-a-seller"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sun-orange px-6 py-3 text-xs font-black tracking-wide text-white uppercase shadow-sm transition-all hover:bg-[#E63E00]"
          >
            Become a Seller <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
    </PolicyShell>
  );
};

export default SellerFeesPage;
